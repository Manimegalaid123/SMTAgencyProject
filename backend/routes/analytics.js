const express = require('express');
const Export = require('../models/Export');
const SalesRecord = require('../models/SalesRecord');
const Product = require('../models/Product');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// DEBUG: Generate sample sales data for testing
router.post('/generate-sample', auth, adminOnly, async (req, res) => {
  try {
    // Clear existing records
    await SalesRecord.deleteMany({});
    
    const sampleData = [
      { month: 7, year: 2025, quantity: 520, revenue: 520 * 12, productName: 'Maggi Noodles' },
      { month: 7, year: 2025, quantity: 180, revenue: 180 * 180, productName: 'Nescafe Coffee' },
      { month: 7, year: 2025, quantity: 240, revenue: 240 * 20, productName: 'KitKat Chocolate' },
      { month: 7, year: 2025, quantity: 110, revenue: 110 * 45, productName: 'Milkmaid' },
      { month: 8, year: 2025, quantity: 480, revenue: 480 * 12, productName: 'Maggi Noodles' },
      { month: 8, year: 2025, quantity: 210, revenue: 210 * 180, productName: 'Nescafe Coffee' },
      { month: 8, year: 2025, quantity: 280, revenue: 280 * 20, productName: 'KitKat Chocolate' },
      { month: 8, year: 2025, quantity: 140, revenue: 140 * 45, productName: 'Milkmaid' },
      { month: 9, year: 2025, quantity: 620, revenue: 620 * 12, productName: 'Maggi Noodles' },
      { month: 9, year: 2025, quantity: 260, revenue: 260 * 180, productName: 'Nescafe Coffee' },
      { month: 9, year: 2025, quantity: 350, revenue: 350 * 20, productName: 'KitKat Chocolate' },
      { month: 9, year: 2025, quantity: 180, revenue: 180 * 45, productName: 'Milkmaid' },
      { month: 10, year: 2025, quantity: 580, revenue: 580 * 12, productName: 'Maggi Noodles' },
      { month: 10, year: 2025, quantity: 240, revenue: 240 * 180, productName: 'Nescafe Coffee' },
      { month: 10, year: 2025, quantity: 320, revenue: 320 * 20, productName: 'KitKat Chocolate' },
      { month: 10, year: 2025, quantity: 160, revenue: 160 * 45, productName: 'Milkmaid' },
      { month: 11, year: 2025, quantity: 650, revenue: 650 * 12, productName: 'Maggi Noodles' },
      { month: 11, year: 2025, quantity: 280, revenue: 280 * 180, productName: 'Nescafe Coffee' },
      { month: 11, year: 2025, quantity: 380, revenue: 380 * 20, productName: 'KitKat Chocolate' },
      { month: 11, year: 2025, quantity: 200, revenue: 200 * 45, productName: 'Milkmaid' },
      { month: 12, year: 2025, quantity: 800, revenue: 800 * 12, productName: 'Maggi Noodles' },
      { month: 12, year: 2025, quantity: 350, revenue: 350 * 180, productName: 'Nescafe Coffee' },
      { month: 12, year: 2025, quantity: 450, revenue: 450 * 20, productName: 'KitKat Chocolate' },
      { month: 12, year: 2025, quantity: 280, revenue: 280 * 45, productName: 'Milkmaid' },
      { month: 1, year: 2026, quantity: 480, revenue: 480 * 12, productName: 'Maggi Noodles' },
      { month: 1, year: 2026, quantity: 210, revenue: 210 * 180, productName: 'Nescafe Coffee' },
      { month: 1, year: 2026, quantity: 280, revenue: 280 * 20, productName: 'KitKat Chocolate' },
      { month: 1, year: 2026, quantity: 140, revenue: 140 * 45, productName: 'Milkmaid' },
      { month: 2, year: 2026, quantity: 600, revenue: 600 * 12, productName: 'Maggi Noodles' },
      { month: 2, year: 2026, quantity: 260, revenue: 260 * 180, productName: 'Nescafe Coffee' },
      { month: 2, year: 2026, quantity: 360, revenue: 360 * 20, productName: 'KitKat Chocolate' },
      { month: 2, year: 2026, quantity: 180, revenue: 180 * 45, productName: 'Milkmaid' },
    ];
    
    await SalesRecord.insertMany(sampleData);
    res.json({ message: 'Sample data generated', count: sampleData.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly', auth, adminOnly, async (req, res) => {
  try {
    const records = await SalesRecord.find().populate('product').sort({ year: 1, month: 1 });
    const byMonth = {};
    records.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { totalQuantity: 0, totalRevenue: 0, products: {} };
      byMonth[key].totalQuantity += r.quantity;
      byMonth[key].totalRevenue += (r.revenue || 0);
      byMonth[key].products[r.productName || r.product?.name || 'Unknown'] = (byMonth[key].products[r.productName] || 0) + r.quantity;
    });
    res.json(Object.entries(byMonth).map(([month, data]) => ({ month, ...data })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/product-wise', auth, adminOnly, async (req, res) => {
  try {
    const records = await SalesRecord.aggregate([
      { $group: { _id: '$product', totalQuantity: { $sum: '$quantity' }, totalRevenue: { $sum: { $ifNull: ['$revenue', 0] } } } },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { productName: '$product.name', totalQuantity: 1, totalRevenue: 1 } },
    ]);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', auth, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = now.getMonth() + 1, thisYear = now.getFullYear();
    const lastMonthRecords = await SalesRecord.find({ month: thisMonth === 1 ? 12 : thisMonth - 1, year: thisMonth === 1 ? thisYear - 1 : thisYear });
    const thisMonthRecords = await SalesRecord.find({ month: thisMonth, year: thisYear });
    const totalSalesLast = lastMonthRecords.reduce((s, r) => s + r.quantity, 0);
    const totalSalesThis = thisMonthRecords.reduce((s, r) => s + r.quantity, 0);
    const lastMonthRevenue = lastMonthRecords.reduce((s, r) => s + (r.revenue || 0), 0);
    const thisMonthRevenue = thisMonthRecords.reduce((s, r) => s + (r.revenue || 0), 0);
    const allRecords = await SalesRecord.find();
    const totalRevenue = allRecords.reduce((s, r) => s + (r.revenue || 0), 0);
    const productCount = await Product.countDocuments();
    const exportCount = await Export.countDocuments();
    res.json({
      totalProducts: productCount,
      totalTransactions: exportCount,
      lastMonthSales: totalSalesLast,
      thisMonthSales: totalSalesThis,
      lastMonthRevenue,
      thisMonthRevenue,
      totalRevenue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
