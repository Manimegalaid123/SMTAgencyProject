const express = require('express');
const Stripe = require('stripe');
const Order = require('../models/Order');
const { applyApprovalSideEffects } = require('../utils/orderApproval');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order belongs to user
    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Block payment unless order is in 'awaiting_payment' status
    if (order.status !== 'awaiting_payment') {
      return res.status(400).json({ error: 'Payment is only allowed after admin approval and after you provide delivery information.' });
    }
    // Check if already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order already paid' });
    }
    
    // Create line items for Stripe
    const lineItems = order.items.map(item => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: item.productName,
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses paisa/cents
      },
      quantity: item.quantity,
    }));
    
    // Add delivery charge as separate line item if applicable
    if (order.deliveryCharge > 0) {
      lineItems.push({
        price_data: {
          currency: 'inr',
          product_data: {
            name: 'Delivery Charge',
          },
          unit_amount: Math.round(order.deliveryCharge * 100),
        },
        quantity: 1,
      });
    }
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-orders?payment=success&orderId=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-orders?payment=cancelled&orderId=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
    });
    
    // Save session ID to order
    order.stripeSessionId = session.id;
    order.paymentMethod = 'stripe';
    await order.save();
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// TEST MODE: Direct payment without Stripe (for development/testing)
router.post('/test-pay', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order belongs to user
    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Mark as paid
    order.paymentMethod = 'stripe';
    order.paymentStatus = 'paid';
    order.amountPaid = order.totalAmount;
    order.paidAt = new Date();
    order.stripePaymentIntentId = 'test_' + Date.now(); // Fake ID for test mode

    // Apply stock deduction/exports/sales and mark order approved
    await applyApprovalSideEffects(order, null);
    
    res.json({ success: true, message: 'Payment successful (Test Mode)' });
  } catch (err) {
    console.error('Test payment error:', err);
    // If stock is not enough, send a specific out-of-stock style error
    if (typeof err.message === 'string' && err.message.toLowerCase().includes('insufficient')) {
      return res.status(409).json({ error: err.message, code: 'OUT_OF_STOCK' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Verify payment status
router.get('/verify/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (!order.stripeSessionId) {
      return res.json({ paymentStatus: order.paymentStatus });
    }

    // Get session from Stripe
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);

    if (session.payment_status === 'paid' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.amountPaid = order.totalAmount;
      order.paidAt = new Date();
      order.stripePaymentIntentId = session.payment_intent;

      // Apply stock deduction/exports/sales and mark order approved
      await applyApprovalSideEffects(order, null);
    }

    res.json({
      paymentStatus: order.paymentStatus,
      stripeStatus: session.payment_status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe Webhook (for automatic payment confirmation)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Update order payment status
    const order = await Order.findById(session.metadata.orderId);
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.amountPaid = order.totalAmount;
      order.paidAt = new Date();
      order.stripePaymentIntentId = session.payment_intent;

      // Apply stock deduction/exports/sales and mark order approved
      await applyApprovalSideEffects(order, null);
      console.log(`Order ${order.orderNumber} marked as paid via webhook`);
    }
  }
  
  res.json({ received: true });
});

// Get payment history for user
router.get('/history', auth, async (req, res) => {
  try {
    const orders = await Order.find({ 
      user: req.user._id,
      paymentStatus: { $in: ['paid', 'partial', 'refunded'] }
    })
    .select('orderNumber totalAmount amountPaid paymentStatus paymentMethod paidAt createdAt')
    .sort({ paidAt: -1 });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
