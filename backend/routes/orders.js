
const express = require('express');
const Order = require('../models/Order');
const Stock = require('../models/Stock');
const Export = require('../models/Export');
const Product = require('../models/Product');
const SalesRecord = require('../models/SalesRecord');
const StockBatch = require('../models/StockBatch');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Mark store pickup order as ready for pickup (admin only)
router.patch('/:id/ready-for-pickup', auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.deliveryType !== 'store_pickup') {
      return res.status(400).json({ error: 'This action is only for store pickup orders' });
    }
    if (order.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved orders can be marked as ready for pickup' });
    }
    order.status = 'ready_for_pickup';
    order.statusHistory.push({ status: 'ready_for_pickup', label: 'Ready for Pickup', date: new Date() });
    // Generate pickup code if not already set
    if (!order.pickupCode) {
      order.pickupCode = generatePickupCode();
    }
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delivery charge calculation constants
const DELIVERY_CONFIG = {
  baseCharge: 100,        // ₹100 base delivery charge
  freeDeliveryAbove: 1500, // Free delivery for orders above ₹1500
  weightSurcharge: {
    upTo25: 0,             // No extra for up to 25 kg
    upTo50: 30,            // +₹30 for 25-50 kg
    upTo100: 60,           // +₹60 for 50-100 kg
    above100: 100          // +₹100 for above 100 kg
  },
  distance: {
    ratePerKm: Number(process.env.DELIVERY_RATE_PER_KM || 8), // ₹ per km
    minCharge: Number(process.env.DELIVERY_MIN_CHARGE || 30),  // minimum charge
    maxCharge: Number(process.env.DELIVERY_MAX_CHARGE || 200), // optional cap
  }
};

// Store location (can be overridden via environment variables)
const STORE_LOCATION = {
  lat: Number(process.env.STORE_LAT || 11.3410),
  lon: Number(process.env.STORE_LON || 77.7172)
};

// Haversine distance in km between two lat/lon pairs
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate delivery charge based on subtotal and weight
const calculateDeliveryCharge = (subtotal, totalWeight, deliveryType, distanceKm) => {
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
  
  const hasDistance = typeof distanceKm === 'number' && Number.isFinite(distanceKm);

  if (hasDistance) {
    const ratePerKm = DELIVERY_CONFIG.distance?.ratePerKm || 8;
    const minCharge = DELIVERY_CONFIG.distance?.minCharge || 0;
    const maxCharge = DELIVERY_CONFIG.distance?.maxCharge || Infinity;

    const billedKm = Math.ceil(distanceKm); // round up to whole km
    let distanceCharge = billedKm * ratePerKm;
    if (minCharge > 0) distanceCharge = Math.max(distanceCharge, minCharge);
    if (Number.isFinite(maxCharge)) distanceCharge = Math.min(distanceCharge, maxCharge);

    // Optional small extra for very heavy loads
    let weightExtra = 0;
    if (totalWeight > 50 && totalWeight <= 100) {
      weightExtra = 30;
    } else if (totalWeight > 100) {
      weightExtra = 60;
    }

    const deliveryCharge = distanceCharge + weightExtra;

    return {
      deliveryCharge,
      breakdown: {
        type: 'Home Delivery - Distance',
        distanceKm: distanceKm.toFixed(1),
        billedKm,
        ratePerKm,
        distanceCharge,
        weightExtra,
        totalWeight: totalWeight.toFixed(2),
        message:
          `Distance: ₹${ratePerKm}/km × ${billedKm} km = ₹${distanceCharge}` +
          (weightExtra ? ` + ₹${weightExtra} heavy-load` : '')
      }
    };
  }

  // Fallback: original base + weight surcharge when distance is not available
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
    const { items, deliveryAddress, notes, deliveryType = 'home_delivery', paymentMethod = 'cod', deliveryLocation } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }
    
    // Delivery address is not required at order creation. It will be collected later if needed.
    
    // Validate items and calculate totals
    let subtotal = 0;
    let totalTax = 0;
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

      // Ensure there is enough non-expired stock using FEFO batches
      // Treat items as valid for the entire expiry date (>= start of today)
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const batches = await StockBatch.find({
        product: item.productId,
        expiryDate: { $gte: startOfToday },
        remainingQuantity: { $gt: 0 },
      }).sort({ expiryDate: 1, createdAt: 1 });

      let availableNonExpired = 0;
      for (const batch of batches) {
        availableNonExpired += batch.remainingQuantity;
      }
      if (availableNonExpired < item.quantity) {
        return res.status(400).json({
          error: `Insufficient non-expired stock for ${product.name} (Available: ${availableNonExpired}, Requested: ${item.quantity})`
        });
      }
      
      const itemSubtotal = product.price * item.quantity;
      const itemWeight = (product.weight || 1) * item.quantity;
      subtotal += itemSubtotal;
      totalWeight += itemWeight;

      const gstRate = typeof product.gstRate === 'number' ? product.gstRate : 0;
      const taxableValue = itemSubtotal; // assuming price is before GST
      const gstAmount = Number(((taxableValue * gstRate) / 100).toFixed(2));
      const lineTotal = taxableValue + gstAmount;
      totalTax += gstAmount;
      
      orderItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal,
        gstRate,
        taxableValue,
        gstAmount,
        lineTotal
      });
    }
    
    // Calculate distance if location is provided for home delivery
    let distanceKm = null;
    if (deliveryType === 'home_delivery' && deliveryLocation && deliveryLocation.lat != null && deliveryLocation.lon != null) {
      const lat = Number(deliveryLocation.lat);
      const lon = Number(deliveryLocation.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        distanceKm = haversineKm(STORE_LOCATION.lat, STORE_LOCATION.lon, lat, lon);
      }
    }

    // Calculate delivery charge
    const { deliveryCharge, breakdown } = calculateDeliveryCharge(subtotal + totalTax, totalWeight, deliveryType, distanceKm);
    const totalAmount = subtotal + totalTax + deliveryCharge;
    
    const orderNumber = await Order.generateOrderNumber();
    
    // Generate pickup code for store pickup orders
    const pickupCode = deliveryType === 'store_pickup' ? generatePickupCode() : undefined;
    
    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      agencyName: req.user.agencyName || req.user.name,
      items: orderItems,
      subtotal,
      totalTax,
      totalWeight,
      deliveryType,
      deliveryCharge,
      totalAmount,
      deliveryAddress: deliveryType === 'home_delivery' ? deliveryAddress : 'Store Pickup - SMT Agency',
      pickupCode,
      notes,
      paymentMethod,
      statusHistory: [
        {
          status: 'pending',
          label: 'Order Placed',
          date: new Date()
        }
      ]
      // Do NOT set paymentStatus at creation
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
        return res.status(400).json({
          error: `Insufficient non-expired stock for ${item.productName} while approving order (Remaining needed: ${remainingToDeduct})`
        });
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
    
    // After admin approval, set status based on payment method
    const now = new Date();
    if (order.paymentMethod === 'cod') {
      order.status = 'approved';
      order.statusHistory.push({ status: 'approved', label: 'Order Approved', date: now });
      order.invoiceNumber = invoiceNumber; // Only set invoice for COD here
    } else {
      order.status = 'awaiting_payment';
      order.statusHistory.push({ status: 'awaiting_payment', label: 'Awaiting Payment', date: now });
      // Do NOT set invoiceNumber for online yet
    }
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

    const isApproved = order.status === 'approved';
    const isPaidOnlineAwaiting =
      order.status === 'awaiting_payment' &&
      order.paymentMethod === 'stripe' &&
      order.paymentStatus === 'paid';

    if (!isApproved && !isPaidOnlineAwaiting) {
      return res.status(400).json({ error: 'Only approved or fully paid online orders can be marked as out for delivery' });
    }

    // If it was awaiting_payment but now fully paid online, log approval in history
    if (isPaidOnlineAwaiting) {
      const now = new Date();
      order.statusHistory.push({ status: 'approved', label: 'Payment received - Approved', date: now });
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
    const deliveredAt = new Date();
    order.deliveredAt = deliveredAt;
    order.statusHistory.push({ status: 'delivered', label: 'Delivered', date: deliveredAt });
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
    const collectedAt = new Date();
    order.collectedAt = collectedAt;
    order.statusHistory.push({ status: 'collected', label: 'Collected', date: collectedAt });
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
    const { items, deliveryType = 'home_delivery', deliveryLocation } = req.body;
    
    if (!items || items.length === 0) {
      return res.json({ subtotal: 0, deliveryCharge: 0, totalWeight: 0, totalAmount: 0 });
    }
    
    let subtotal = 0;
    let totalWeight = 0;
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const lineSubtotal = product.price * item.quantity;
        subtotal += lineSubtotal;

        // include GST in preview subtotal, like in order creation
        const gstRate = typeof product.gstRate === 'number' ? product.gstRate : 0;
        const taxableValue = lineSubtotal;
        const gstAmount = Number(((taxableValue * gstRate) / 100).toFixed(2));
        subtotal += gstAmount;

        totalWeight += (product.weight || 1) * item.quantity;
      }
    }
    
    // Calculate distance if we have a delivery location
    let distanceKm = null;
    if (deliveryType === 'home_delivery' && deliveryLocation && deliveryLocation.lat != null && deliveryLocation.lon != null) {
      const lat = Number(deliveryLocation.lat);
      const lon = Number(deliveryLocation.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        distanceKm = haversineKm(STORE_LOCATION.lat, STORE_LOCATION.lon, lat, lon);
      }
    }

    const { deliveryCharge, breakdown } = calculateDeliveryCharge(subtotal, totalWeight, deliveryType, distanceKm);
    
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
