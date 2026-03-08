const express = require('express');
const Export = require('../models/Export');
const Stock = require('../models/Stock');
const SalesRecord = require('../models/SalesRecord');
const Product = require('../models/Product');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const exports = await Export.find().populate('product').sort({ date: -1 });
    res.json(exports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { product, quantity, agency, agencyName, notes } = req.body;
    const stock = await Stock.findOne({ product });
    if (!stock || stock.quantity < quantity) return res.status(400).json({ error: 'Insufficient stock' });
    stock.quantity -= quantity;
    stock.lastUpdated = new Date();
    await stock.save();
    const exp = await Export.create({ product, quantity, agency, agencyName, notes });
    const prod = await Product.findById(product);
    const price = prod?.price || 0;
    const revenue = price * quantity;
    const d = new Date();
    const month = d.getMonth() + 1, year = d.getFullYear();
    await SalesRecord.findOneAndUpdate(
      { product, month, year },
      { $inc: { quantity, revenue }, productName: prod?.name, $set: { year, month } },
      { upsert: true, new: true }
    );
    const populated = await Export.findById(exp._id).populate('product');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
