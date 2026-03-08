const express = require('express');
const Stock = require('../models/Stock');
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
