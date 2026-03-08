const express = require('express');
const Import = require('../models/Import');
const Stock = require('../models/Stock');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const imports = await Import.find().populate('product').sort({ date: -1 });
    res.json(imports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const imp = await Import.create(req.body);
    const stock = await Stock.findOne({ product: imp.product });
    if (stock) {
      stock.quantity += imp.quantity;
      stock.lastUpdated = new Date();
      await stock.save();
    } else {
      await Stock.create({ product: imp.product, quantity: imp.quantity });
    }
    const populated = await Import.findById(imp._id).populate('product');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
