const express = require('express');
const Order = require('../models/Order');
const Stock = require('../models/Stock');
const Export = require('../models/Export');
const Product = require('../models/Product');
const SalesRecord = require('../models/SalesRecord');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Delivery charge calculation constants
const DELIVERY_CONFIG = {
  baseCharge: 100,        // ₹100 base delivery charge
  freeDeliveryAbove: 1500, // Free delivery for orders above ₹1500
  weightSurcharge: {
    upTo25: 0,             // No extra for up to 25 kg
    upTo50: 30,            // +₹30 for 25-50 kg
    upTo100: 60,           // +₹60 for 50-100 kg
    above100: 100          // +₹100 for above 100 kg
  }
};

// Calculate delivery charge based on subtotal and weight
const calculateDeliveryCharge = (subtotal, totalWeight, deliveryType) => {
  // Store pickup = no delivery charge
  if (deliveryType === 'store_pickup') {
    return { deliveryCharge: 0, breakdown: { type: 'Store Pickup', message: 'No delivery charge' } };
  }
  
  // Free delivery for orders above threshold
  if (subtotal >= DELIVERY_CONFIG.freeDeliveryAbove) {
    return { 
      deliveryCharge: 0, 
      breakdown: { 
        type: 'Free Delivery', 
        message: `Free delivery on orders above ₹${DELIVERY_CONFIG.freeDeliveryAbove}` 
      } 
    };
  }
  
  // Calculate base + weight surcharge
  let baseCharge = DELIVERY_CONFIG.baseCharge;
  let weightSurcharge = 0;
  let weightCategory = '';
  
  if (totalWeight <= 25) {
    weightSurcharge = DELIVERY_CONFIG.weightSurcharge.upTo25;
    weightCategory = 'Up to 25 kg';
  } else if (totalWeight <= 50) {
    weightSurcharge = DELIVERY_CONFIG.weightSurcharge.upTo50;
    weightCategory = '25-50 kg';
  } else if (totalWeight <= 100) {
    weightSurcharge = DELIVERY_CONFIG.weightSurcharge.upTo100;
    weightCategory = '50-100 kg';
  } else {
    weightSurcharge = DELIVERY_CONFIG.weightSurcharge.above100;
    weightCategory = 'Above 100 kg';
  }
  
  const deliveryCharge = baseCharge + weightSurcharge;
  
  return {
    deliveryCharge,
    breakdown: {
      type: 'Home Delivery',
      baseCharge,
      weightSurcharge,
      weightCategory,
      totalWeight: totalWeight.toFixed(2),
      message: weightSurcharge > 0 
        ? `₹${baseCharge} base + ₹${weightSurcharge} (${weightCategory})`
        : `₹${baseCharge} base charge`
    }
  };
};

// Generate 6-digit pickup code
const generatePickupCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get delivery config for frontend
router.get('/delivery-config', auth, async (req, res) => {
  res.json(DELIVERY_CONFIG);
});

// Get orders - Admin gets all, Agency gets their own
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }
    
    const orders = await Order.find(query)
      .populate('user', 'name email agencyName')
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email agencyName')
      .populate('items.product');
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Agency can only see their own orders
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order (Agency/Shop Owner)
router.post('/', auth, async (req, res) => {
  try {
    const { items, deliveryAddress, notes, deliveryType = 'home_delivery' } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }
    
    // Store pickup doesn't need address, home delivery does
    if (deliveryType === 'home_delivery' && !deliveryAddress) {
      return res.status(400).json({ error: 'Delivery address is required for home delivery' });
    }
    
    // Validate items and calculate totals
    let subtotal = 0;
    let totalWeight = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.productId}` });
      }
      
      const stock = await Stock.findOne({ product: item.productId });
      if (!stock || stock.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      
      const itemSubtotal = product.price * item.quantity;
      const itemWeight = (product.weight || 1) * item.quantity;
      subtotal += itemSubtotal;
      totalWeight += itemWeight;
      
      orderItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal
      });
    }
    
    // Calculate delivery charge
    const { deliveryCharge, breakdown } = calculateDeliveryCharge(subtotal, totalWeight, deliveryType);
    const totalAmount = subtotal + deliveryCharge;
    
    const orderNumber = await Order.generateOrderNumber();
    
    // Generate pickup code for store pickup orders
    const pickupCode = deliveryType === 'store_pickup' ? generatePickupCode() : undefined;
    
    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      agencyName: req.user.agencyName || req.user.name,
      items: orderItems,
      subtotal,
      totalWeight,
      deliveryType,
      deliveryCharge,
      totalAmount,
      deliveryAddress: deliveryType === 'home_delivery' ? deliveryAddress : 'Store Pickup - SMT Agency',
      pickupCode,
      notes,
      statusHistory: [
        {
          status: 'pending',
          label: 'Order Placed',
          date: new Date()
        }
      ]
    });
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email agencyName')
      .populate('items.product');
    
    res.status(201).json(populatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve order (Admin only) - Auto-creates Export
router.patch('/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve order with status: ${order.status}` });
    }
    
    // Check stock availability for all items
    for (const item of order.items) {
      const stock = await Stock.findOne({ product: item.product });
      if (!stock || stock.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${item.productName}` });
      }
    }
    
    // Generate invoice number
    const invoiceNumber = await Order.generateInvoiceNumber();
    
    // Create exports and update stock for each item
    for (const item of order.items) {
      // Deduct from stock
      const stock = await Stock.findOne({ product: item.product });
      stock.quantity -= item.quantity;
      stock.lastUpdated = new Date();
      await stock.save();
      
      // Create export record
      await Export.create({
        product: item.product,
        quantity: item.quantity,
        agency: order.user,
        agencyName: order.agencyName,
        notes: `Order: ${order.orderNumber}`
      });
      
      // Update sales record
      const d = new Date();
      const month = d.getMonth() + 1, year = d.getFullYear();
      await SalesRecord.findOneAndUpdate(
        { product: item.product, month, year },
        { 
          $inc: { quantity: item.quantity, revenue: item.subtotal }, 
          productName: item.productName, 
          $set: { year, month } 
        },
        { upsert: true, new: true }
      );
    }
    
    // Update order status based on delivery type
    const now = new Date();
    if (order.deliveryType === 'store_pickup') {
      order.status = 'ready_for_pickup';
      order.statusHistory.push({ status: 'ready_for_pickup', label: 'Ready for Pickup', date: now });
    } else {
      order.status = 'approved';
      order.statusHistory.push({ status: 'approved', label: 'Order Approved', date: now });
    }
    order.invoiceNumber = invoiceNumber;
    order.approvedAt = new Date();
    order.approvedBy = req.user._id;
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email agencyName')
      .populate('items.product');
    
    res.json(populatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject order (Admin only)
router.patch('/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject order with status: ${order.status}` });
    }
    
    order.status = 'rejected';
    order.rejectionReason = reason || 'No reason provided';
    order.statusHistory.push({ status: 'rejected', label: 'Order Rejected', date: new Date() });
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email agencyName')
      .populate('items.product');
    
    res.json(populatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as out for delivery (Admin only - Home Delivery)
router.patch('/:id/out-for-delivery', auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.deliveryType !== 'home_delivery') {
      return res.status(400).json({ error: 'This action is only for home delivery orders' });
    }
    
    if (order.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved orders can be marked as out for delivery' });
    }
    
    order.status = 'out_for_delivery';
    order.statusHistory.push({ status: 'out_for_delivery', label: 'Out for Delivery', date: new Date() });
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email agencyName')
      .populate('items.product');
    
    res.json(populatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as delivered (Admin only - Home Delivery)
router.patch('/:id/deliver', auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.deliveryType !== 'home_delivery') {
      return res.status(400).json({ error: 'This action is only for home delivery orders' });
    }
    
    if (!['approved', 'out_for_delivery'].includes(order.status)) {
      return res.status(400).json({ error: 'Only approved/dispatched orders can be marked as delivered' });
    }
    
    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email agencyName')
      .populate('items.product');
    
    res.json(populatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify pickup code and mark as collected (Admin only - Store Pickup)
router.patch('/:id/collect', auth, adminOnly, async (req, res) => {
  try {
    const { pickupCode } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.deliveryType !== 'store_pickup') {
      return res.status(400).json({ error: 'This action is only for store pickup orders' });
    }
    
    if (order.status !== 'ready_for_pickup') {
      return res.status(400).json({ error: 'Order is not ready for pickup' });
    }
    
    // Verify pickup code
    if (order.pickupCode !== pickupCode) {
      return res.status(400).json({ error: 'Invalid pickup code' });
    }
    
    order.status = 'collected';
    order.collectedAt = new Date();
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email agencyName')
      .populate('items.product');
    
    res.json(populatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate delivery charge (for frontend preview)
router.post('/calculate-delivery', auth, async (req, res) => {
  try {
    const { items, deliveryType = 'home_delivery' } = req.body;
    
    if (!items || items.length === 0) {
      return res.json({ subtotal: 0, deliveryCharge: 0, totalWeight: 0, totalAmount: 0 });
    }
    
    let subtotal = 0;
    let totalWeight = 0;
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        subtotal += product.price * item.quantity;
        totalWeight += (product.weight || 1) * item.quantity;
      }
    }
    
    const { deliveryCharge, breakdown } = calculateDeliveryCharge(subtotal, totalWeight, deliveryType);
    
    res.json({
      subtotal,
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      deliveryCharge,
      totalAmount: subtotal + deliveryCharge,
      breakdown,
      freeDeliveryThreshold: DELIVERY_CONFIG.freeDeliveryAbove
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
