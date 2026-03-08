const express = require('express');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const stocks = await Stock.find().populate('product');
    const stockMap = {};
    const lastUpdatedMap = {};
    stocks.forEach(s => {
      const id = s.product._id.toString();
      stockMap[id] = s.quantity;
      lastUpdatedMap[id] = s.lastUpdated;
    });
    let totalStockValue = 0;
    const list = products.map(p => {
      const qty = stockMap[p._id.toString()] ?? 0;
      const stockValue = (p.price || 0) * qty;
      totalStockValue += stockValue;
      const availabilityStatus = qty > 0 ? 'Available' : 'Out of Stock';
      return {
        ...p.toObject(),
        stock: qty,
        availableQuantity: qty,
        lastUpdated: lastUpdatedMap[p._id.toString()] || p.createdAt,
        stockValue,
        totalProductValue: stockValue,
        availabilityStatus,
        status: availabilityStatus,
      };
    });
    res.json({ products: list, totalStockValue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const stock = await Stock.findOne({ product: product._id });
    const qty = stock?.quantity ?? 0;
    const stockValue = (product.price || 0) * qty;
    const availabilityStatus = qty > 0 ? 'Available' : 'Out of Stock';
    res.json({
      ...product.toObject(),
      stock: qty,
      availableQuantity: qty,
      lastUpdated: stock?.lastUpdated || product.createdAt,
      stockValue,
      availabilityStatus,
      status: availabilityStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const productData = { ...req.body };
    const qty = Number(productData.availableQuantity) || 0;
    productData.status = qty > 0 ? 'Available' : 'Out of Stock';
    const product = await Product.create(productData);
    await Stock.create({ product: product._id, quantity: qty });
    const populated = await Product.findById(product._id);
    const stock = await Stock.findOne({ product: product._id });
    res.status(201).json({
      ...populated.toObject(),
      stock: qty,
      availableQuantity: qty,
      stockValue: (product.price || 0) * qty,
      availabilityStatus: productData.status,
      status: productData.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const productData = { ...req.body };
    if (productData.availableQuantity !== undefined) {
      const qty = Number(productData.availableQuantity) || 0;
      productData.status = qty > 0 ? 'Available' : 'Out of Stock';
    }
    const product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (productData.availableQuantity !== undefined) {
      const qty = Number(productData.availableQuantity) || 0;
      await Stock.findOneAndUpdate(
        { product: product._id },
        { quantity: qty, lastUpdated: new Date() }
      );
    }

    const stock = await Stock.findOne({ product: product._id });
    const finalQty = stock?.quantity ?? Number(product.availableQuantity) ?? 0;
    const availabilityStatus = finalQty > 0 ? 'Available' : 'Out of Stock';
    res.json({
      ...product.toObject(),
      stock: finalQty,
      availableQuantity: finalQty,
      lastUpdated: stock?.lastUpdated || product.updatedAt,
      stockValue: (product.price || 0) * finalQty,
      availabilityStatus,
      status: availabilityStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await Stock.deleteOne({ product: product._id });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
