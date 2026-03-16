const express = require('express');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const StockBatch = require('../models/StockBatch');
const Import = require('../models/Import');
const Export = require('../models/Export');
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

// Expiry & Near-Expiry Report (by Stock Batches)
router.get('/reports/expiry', auth, adminOnly, async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = new Date(today);
    threshold.setDate(threshold.getDate() + days);

    const batches = await StockBatch.find({ remainingQuantity: { $gt: 0 } })
      .populate('product')
      .sort({ expiryDate: 1 });

    const expired = [];
    const nearExpiry = [];
    const healthy = [];

    for (const b of batches) {
      if (!b.expiryDate) {
        healthy.push(b);
        continue;
      }
      const daysLeft = Math.ceil((b.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const base = {
        batchId: b._id,
        productId: b.product?._id,
        name: b.product?.name || 'Unknown',
        packSize: b.product?.packSize || '',
        remainingQuantity: b.remainingQuantity,
        totalQuantity: b.quantity,
        expiryDate: b.expiryDate,
        manufactureDate: b.manufactureDate,
        source: b.source,
        daysLeft,
      };
      if (b.expiryDate < today) {
        expired.push({ ...base, status: 'expired' });
      } else if (b.expiryDate <= threshold) {
        nearExpiry.push({ ...base, status: 'near_expiry' });
      } else {
        healthy.push(b);
      }
    }

    // Sort near-expiry by days left
    nearExpiry.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({
      days,
      counts: {
        expired: expired.length,
        nearExpiry: nearExpiry.length,
        healthy: healthy.length,
      },
      expired,
      nearExpiry,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock Movement History (Imports, Exports, Remaining Stock) per product
router.get('/reports/movements', auth, adminOnly, async (req, res) => {
  try {
    const [products, stocks, imports, exports] = await Promise.all([
      Product.find(),
      Stock.find(),
      Import.find(),
      Export.find(),
    ]);

    const stockMap = new Map();
    stocks.forEach(s => {
      stockMap.set(s.product.toString(), s);
    });

    const importMap = new Map();
    imports.forEach(imp => {
      const id = imp.product.toString();
      const entry = importMap.get(id) || { quantity: 0, lastDate: null };
      entry.quantity += imp.quantity;
      if (!entry.lastDate || imp.date > entry.lastDate) entry.lastDate = imp.date;
      importMap.set(id, entry);
    });

    const exportMap = new Map();
    exports.forEach(exp => {
      const id = exp.product.toString();
      const entry = exportMap.get(id) || { quantity: 0, lastDate: null };
      entry.quantity += exp.quantity;
      if (!entry.lastDate || exp.date > entry.lastDate) entry.lastDate = exp.date;
      exportMap.set(id, entry);
    });

    const result = products.map(p => {
      const id = p._id.toString();
      const stock = stockMap.get(id);
      const imp = importMap.get(id) || { quantity: 0, lastDate: null };
      const exp = exportMap.get(id) || { quantity: 0, lastDate: null };
      const lastMovement = [imp.lastDate, exp.lastDate].filter(Boolean).sort((a, b) => b - a)[0] || null;
      return {
        productId: p._id,
        name: p.name,
        packSize: p.packSize || '',
        currentStock: stock ? stock.quantity : 0,
        totalImported: imp.quantity,
        totalExported: exp.quantity,
        lastImportDate: imp.lastDate,
        lastExportDate: exp.lastDate,
        lastMovement,
      };
    });

    res.json({ products: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
