const express = require('express');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Helper to update product rating when a new review is approved
async function applyApprovedReviewToProduct(review) {
  if (!review || !review.product) return;
  const product = await Product.findById(review.product);
  if (!product) return;

  const currentAvg = product.avgRating || 0;
  const currentCount = product.reviewCount || 0;
  const newCount = currentCount + 1;
  const newAvg = ((currentAvg * currentCount) + review.rating) / newCount;

  product.avgRating = Number(newAvg.toFixed(2));
  product.reviewCount = newCount;
  await product.save();
}

// Create a new review (agency user)
router.post('/', auth, async (req, res) => {
  try {
    const { orderId, productId, rating, title, comment } = req.body;

    if (!orderId || !productId || !rating) {
      return res.status(400).json({ error: 'orderId, productId and rating are required' });
    }

    // Validate order belongs to user and is delivered/collected
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only review your own orders' });
    }
    if (!['delivered', 'collected'].includes(order.status)) {
      return res.status(400).json({ error: 'You can review only delivered or collected orders' });
    }

    // items.product may be populated (document) or just an ObjectId
    const hasProduct = order.items.some((i) => {
      const pid = i.product && i.product._id
        ? i.product._id.toString()
        : i.product?.toString();
      return pid === productId;
    });
    if (!hasProduct) {
      return res.status(400).json({ error: 'This product is not part of the selected order' });
    }

    // Check duplicate review
    const existing = await Review.findOne({ user: req.user._id, order: orderId, product: productId });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product for this order' });
    }

    const cleanComment = (comment || '').trim();
    const review = await Review.create({
      user: req.user._id,
      order: orderId,
      product: productId,
      rating,
      title: (title || '').trim() || undefined,
      comment: cleanComment || undefined,
      status: 'pending',
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get approved reviews for a product (public for authenticated users)
router.get('/product/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product: productId, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name agencyName');

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user's reviews
router.get('/my', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get pending reviews
router.get('/admin/pending', auth, adminOnly, async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('user', 'name agencyName')
      .populate('product', 'name packSize');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update review status (approve / reject)
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (review.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending reviews can be updated' });
    }

    review.status = status;
    await review.save();

    if (status === 'approved') {
      await applyApprovedReviewToProduct(review);
    }

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
