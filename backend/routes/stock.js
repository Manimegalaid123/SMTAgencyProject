const express = require('express');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const stocks = await Stock.find().populate('product').sort({ lastUpdated: -1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Low Stock Alerts - Get products below threshold (uses Stock model)
router.get('/low-stock', auth, adminOnly, async (req, res) => {
  try {
    // Get all stocks with product info
    const stocks = await Stock.find().populate('product');
    
    // Filter low stock items based on product's lowStockThreshold
    const lowStockItems = stocks.filter(s => {
      if (!s.product) return false;
      const threshold = s.product.lowStockThreshold || 50;
      return s.quantity <= threshold;
    });
    
    // Sort by quantity (lowest first)
    lowStockItems.sort((a, b) => a.quantity - b.quantity);
    
    // Categorize by severity
    const critical = lowStockItems.filter(s => s.quantity === 0);
    const warning = lowStockItems.filter(s => {
      const threshold = s.product?.lowStockThreshold || 50;
      return s.quantity > 0 && s.quantity <= threshold * 0.5;
    });
    const low = lowStockItems.filter(s => {
      const threshold = s.product?.lowStockThreshold || 50;
      return s.quantity > threshold * 0.5 && s.quantity <= threshold;
    });
    
    res.json({
      total: lowStockItems.length,
      critical: critical.length,
      warning: warning.length,
      low: low.length,
      products: lowStockItems.map(s => ({
        _id: s.product?._id,
        name: s.product?.name || 'Unknown',
        availableQuantity: s.quantity,
        lowStockThreshold: s.product?.lowStockThreshold || 50,
        status: s.quantity === 0 ? 'Out of Stock' : 
                s.quantity <= (s.product?.lowStockThreshold || 50) ? 'Low Stock' : 'Available',
        severity: s.quantity === 0 ? 'critical' : 
                  s.quantity <= (s.product?.lowStockThreshold || 50) * 0.5 ? 'warning' : 'low'
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update low stock threshold for a product
router.patch('/threshold/:productId', auth, adminOnly, async (req, res) => {
  try {
    const { threshold } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { lowStockThreshold: threshold },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:productId', auth, adminOnly, async (req, res) => {
  try {
    const stock = await Stock.findOne({ product: req.params.productId }).populate('product');
    if (!stock) return res.status(404).json({ quantity: 0 });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
