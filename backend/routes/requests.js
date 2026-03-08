const express = require('express');
const ProductRequest = require('../models/ProductRequest');
const Stock = require('../models/Stock');
const Export = require('../models/Export');
const SalesRecord = require('../models/SalesRecord');
const Product = require('../models/Product');
const { auth, adminOnly, agencyOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { requestedBy: req.user._id };
    const requests = await ProductRequest.find(query).populate('product').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, agencyOnly, async (req, res) => {
  try {
    const { product, quantity, notes } = req.body;
    if (!product || !quantity || quantity <= 0) return res.status(400).json({ error: 'Product and quantity required' });
    const request = await ProductRequest.create({
      product,
      quantity,
      requestedBy: req.user._id,
      agencyName: req.user.agencyName || req.user.name || req.user.email,
      notes,
    });
    const populated = await ProductRequest.findById(request._id).populate('product');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const reqDoc = await ProductRequest.findById(req.params.id).populate('product');
    if (!reqDoc) return res.status(404).json({ error: 'Request not found' });
    if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    reqDoc.status = status;
    if (adminNotes != null) reqDoc.adminNotes = adminNotes;
    reqDoc.updatedAt = new Date();
    if (status === 'approved') {
      const stock = await Stock.findOne({ product: reqDoc.product._id });
      if (!stock || stock.quantity < reqDoc.quantity) return res.status(400).json({ error: 'Insufficient stock to approve' });
      stock.quantity -= reqDoc.quantity;
      stock.lastUpdated = new Date();
      await stock.save();
      await Export.create({
        product: reqDoc.product._id,
        quantity: reqDoc.quantity,
        agency: reqDoc.requestedBy,
        agencyName: reqDoc.agencyName,
        notes: 'Approved from request',
      });
      const prod = await Product.findById(reqDoc.product._id);
      const price = prod?.price || 0;
      const revenue = price * reqDoc.quantity;
      const d = new Date();
      const month = d.getMonth() + 1, year = d.getFullYear();
      await SalesRecord.findOneAndUpdate(
        { product: reqDoc.product._id, month, year },
        { $inc: { quantity: reqDoc.quantity, revenue }, productName: prod?.name, $set: { year, month } },
        { upsert: true }
      );
    }
    await reqDoc.save();
    const updated = await ProductRequest.findById(reqDoc._id).populate('product');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
