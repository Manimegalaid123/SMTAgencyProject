const Order = require('../models/Order');
const Stock = require('../models/Stock');
const Export = require('../models/Export');
const SalesRecord = require('../models/SalesRecord');
const StockBatch = require('../models/StockBatch');

// Apply stock deduction, FEFO batch updates, export creation, and sales records.
// Also sets status/invoice depending on payment method and payment status.
async function applyApprovalSideEffects(order, approvedByUserId) {
  if (!order) throw new Error('Order not found');

  // Allow only fresh/pending or awaiting_payment orders
  if (order.status && !['pending', 'awaiting_payment'].includes(order.status)) {
    throw new Error(`Cannot approve order with status: ${order.status}`);
  }

  // Check stock availability for all items (aggregated)
  for (const item of order.items) {
    const stock = await Stock.findOne({ product: item.product });
    if (!stock || stock.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${item.productName}`);
    }
  }

  // Create exports, update FEFO batches, aggregated stock and sales records
  for (const item of order.items) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let remainingToDeduct = item.quantity;

    // Deduct from stock batches (FEFO based on expiryDate)
    const batches = await StockBatch.find({
      product: item.product,
      expiryDate: { $gte: startOfToday },
      remainingQuantity: { $gt: 0 },
    }).sort({ expiryDate: 1, createdAt: 1 });

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;
      const take = Math.min(batch.remainingQuantity, remainingToDeduct);
      batch.remainingQuantity -= take;
      if (batch.remainingQuantity === 0) {
        batch.exhaustedAt = new Date();
      }
      await batch.save();
      remainingToDeduct -= take;
    }

    if (remainingToDeduct > 0) {
      throw new Error(
        `Insufficient non-expired stock for ${item.productName} while approving order (Remaining needed: ${remainingToDeduct})`
      );
    }

    // Deduct from aggregated stock record
    const stock = await Stock.findOne({ product: item.product });
    if (stock) {
      stock.quantity -= item.quantity;
      stock.lastUpdated = new Date();
      await stock.save();
    }

    // Create export record
    await Export.create({
      product: item.product,
      quantity: item.quantity,
      agency: order.user,
      agencyName: order.agencyName,
      notes: `Order: ${order.orderNumber}`,
    });

    // Update sales record
    const d = new Date();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    await SalesRecord.findOneAndUpdate(
      { product: item.product, month, year },
      {
        $inc: { quantity: item.quantity, revenue: item.subtotal },
        productName: item.productName,
        $set: { year, month },
      },
      { upsert: true, new: true }
    );
  }

  const now = new Date();

  if (order.paymentMethod === 'cod') {
    // COD: confirm immediately on approval
    order.status = 'approved';
    order.statusHistory.push({ status: 'approved', label: 'Order Confirmed', date: now });
    if (!order.invoiceNumber) {
      order.invoiceNumber = await Order.generateInvoiceNumber();
    }
  } else {
    // Online payments: if already paid, mark approved here, else awaiting_payment
    if (order.paymentStatus === 'paid') {
      order.status = 'approved';
      order.statusHistory.push({ status: 'approved', label: 'Payment received - Approved', date: now });
      if (!order.invoiceNumber) {
        order.invoiceNumber = await Order.generateInvoiceNumber();
      }
    } else {
      order.status = 'awaiting_payment';
      order.statusHistory.push({ status: 'awaiting_payment', label: 'Awaiting Payment', date: now });
    }
  }

  order.approvedAt = now;
  if (approvedByUserId) {
    order.approvedBy = approvedByUserId;
  }

  await order.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('user', 'name email agencyName')
    .populate('items.product');

  return populatedOrder;
}

module.exports = { applyApprovalSideEffects };
