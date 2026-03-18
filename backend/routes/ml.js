const express = require('express');
const SalesRecord = require('../models/SalesRecord');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

router.get('/predict', auth, adminOnly, async (req, res) => {
  try {
    const records = await SalesRecord.find().sort({ year: 1, month: 1 });
    const byMonth = {};
    records.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + r.quantity;
    });
    const data = Object.entries(byMonth).map(([month, quantity]) => ({ month, quantity }));
    if (data.length < 2) {
      return res.json({ prediction: 0, message: 'Insufficient historical data for prediction' });
    }
    const response = await fetch(`${ML_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    }).catch(() => null);
    if (!response || !response.ok) {
      const fallback = data.length > 0 ? Math.round(data[data.length - 1].quantity * 1.05) : 0;
      return res.json({ prediction: fallback, message: 'ML service unavailable; showing trend-based estimate' });
    }
    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/predict-full', auth, adminOnly, async (req, res) => {
  try {
    const records = await SalesRecord.find().sort({ year: 1, month: 1 }).populate('product');
    const byMonth = {};
    const byProduct = {};
    records.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + r.quantity;
      const name = r.productName || r.product?.name || 'Unknown';
      if (!byProduct[name]) byProduct[name] = {};
      byProduct[name][key] = (byProduct[name][key] || 0) + r.quantity;
    });

    const overallData = Object.entries(byMonth).map(([month, quantity]) => ({ month, quantity }));

    // Build per-product time series and basic recent-month stats
    const productStats = {};
    const productsData = Object.entries(byProduct).map(([productName, months]) => {
      const ordered = Object.entries(months)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, quantity]) => ({ month, quantity }));
      const len = ordered.length;
      const thisMonthQty = len > 0 ? ordered[len - 1].quantity : 0;
      const lastMonthQty = len > 1 ? ordered[len - 2].quantity : 0;
      productStats[productName] = { thisMonthQty, lastMonthQty };
      return { productName, data: ordered };
    });

    const products = await Product.find();
    const priceMap = {};
    products.forEach(p => { priceMap[p.name] = p.price || 0; });

    const response = await fetch(`${ML_URL}/predict-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overall: overallData, products: productsData }),
    }).catch(() => null);

    if (!response || !response.ok) {
      const fallbackQty = overallData.length > 0 ? Math.round(overallData[overallData.length - 1].quantity * 1.05) : 0;
      const fallbackRevenue = fallbackQty * (products.length ? products.reduce((s, p) => s + (p.price || 0), 0) / products.length : 0);
      return res.json({
        prediction: fallbackQty,
        predictionRevenue: Math.round(fallbackRevenue),
        productPredictions: productsData.map(p => ({ productName: p.productName, prediction: 0 })),
        message: 'ML service unavailable; showing trend-based estimate',
      });
    }
    const result = await response.json();

    // Current stock per product (by name)
    const stocks = await Stock.find().populate('product', 'name');
    const stockMap = {};
    stocks.forEach(s => {
      const name = s.product?.name;
      if (name) stockMap[name] = s.quantity || 0;
    });

    let predictionRevenue = 0;
    const productPredictions = (result.productPredictions || []).map(pp => {
      const price = priceMap[pp.productName] || 0;
      const revenue = Math.round((pp.prediction || 0) * price);
      predictionRevenue += revenue;

      const stats = productStats[pp.productName] || {};
      const thisMonthQty = stats.thisMonthQty || 0;
      const lastMonthQty = stats.lastMonthQty || 0;
      const currentStock = stockMap[pp.productName] || 0;
      const targetStock = (pp.prediction || 0) * 1.2; // 20% safety buffer
      const suggestedImportUnits = Math.max(0, Math.round(targetStock - currentStock));

      return {
        ...pp,
        revenue,
        thisMonthQty,
        lastMonthQty,
        currentStock,
        suggestedImportUnits,
      };
    });
    res.json({
      prediction: result.prediction ?? 0,
      predictionRevenue,
      productPredictions,
      message: result.message || 'Next month sales prediction (Linear Regression)',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/training-data', auth, adminOnly, async (req, res) => {
  try {
    const records = await SalesRecord.find().sort({ year: 1, month: 1 });
    const byMonth = {};
    records.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + r.quantity;
    });
    res.json(Object.entries(byMonth).map(([month, quantity]) => ({ month, quantity })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
