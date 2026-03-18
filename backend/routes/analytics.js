const express = require('express');
const Export = require('../models/Export');
const Import = require('../models/Import');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Monthly analytics - from actual Export data (sales to shops)
router.get('/monthly', auth, adminOnly, async (req, res) => {
  try {
    const exports = await Export.find().populate('product').sort({ date: 1 });
    
    const byMonth = {};
    exports.forEach(exp => {
      if (!exp.product) return;
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const revenue = exp.quantity * (exp.product.price || 0);
      
      if (!byMonth[key]) {
        byMonth[key] = { totalQuantity: 0, totalRevenue: 0, products: {} };
      }
      byMonth[key].totalQuantity += exp.quantity;
      byMonth[key].totalRevenue += revenue;
      
      const productName = exp.product.name || 'Unknown';
      byMonth[key].products[productName] = (byMonth[key].products[productName] || 0) + exp.quantity;
    });
    
    const result = Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Product-wise analytics - from actual Export data
router.get('/product-wise', auth, adminOnly, async (req, res) => {
  try {
    const productStats = await Export.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productInfo.name' },
          productPrice: { $first: '$productInfo.price' },
          totalQuantity: { $sum: '$quantity' },
          exportCount: { $sum: 1 }
        }
      },
      {
        $project: {
          productName: 1,
          totalQuantity: 1,
          totalRevenue: { $multiply: ['$totalQuantity', '$productPrice'] },
          exportCount: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    res.json(productStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Summary analytics - from actual data
router.get('/summary', auth, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    // Get start/end of this month and last month
    const thisMonthStart = new Date(thisYear, thisMonth, 1);
    const thisMonthEnd = new Date(thisYear, thisMonth + 1, 0, 23, 59, 59);
    const lastMonthStart = new Date(thisYear, thisMonth - 1, 1);
    const lastMonthEnd = new Date(thisYear, thisMonth, 0, 23, 59, 59);
    
    // Get all exports with product info
    const allExports = await Export.find().populate('product');
    
    // Calculate totals
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let thisMonthSales = 0;
    let lastMonthSales = 0;
    
    allExports.forEach(exp => {
      if (!exp.product) return;
      const revenue = exp.quantity * (exp.product.price || 0);
      const expDate = new Date(exp.date);
      
      totalRevenue += revenue;
      
      if (expDate >= thisMonthStart && expDate <= thisMonthEnd) {
        thisMonthRevenue += revenue;
        thisMonthSales += exp.quantity;
      } else if (expDate >= lastMonthStart && expDate <= lastMonthEnd) {
        lastMonthRevenue += revenue;
        lastMonthSales += exp.quantity;
      }
    });
    
    // Calculate growth percentages (both based on revenue for consistency)
    const revenueGrowth = lastMonthRevenue > 0 
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : thisMonthRevenue > 0 ? 100 : 0;

    // Sales growth now mirrors revenue growth, so high revenue always shows high growth
    const salesGrowth = revenueGrowth;
    
    // Daily averages (days passed this month)
    const daysPassed = now.getDate();
    const dailyAvgRevenue = Math.round(thisMonthRevenue / daysPassed);
    const dailyAvgSales = Math.round(thisMonthSales / daysPassed);
    
    const productCount = await Product.countDocuments();
    const exportCount = await Export.countDocuments();

    // Total agencies (customers)
    const totalAgencies = await User.countDocuments({ role: 'agency' });

    // Top agencies/customers by revenue (using Export data)
    const topAgencies = await Export.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$agency',
          agencyName: { $first: '$agencyName' },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', '$productInfo.price'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      totalProducts: productCount,
      totalTransactions: exportCount,
      lastMonthSales,
      thisMonthSales,
      lastMonthRevenue,
      thisMonthRevenue,
      totalRevenue,
      revenueGrowth: parseFloat(revenueGrowth),
      salesGrowth: parseFloat(salesGrowth),
      dailyAvgRevenue,
      dailyAvgSales,
      totalAgencies,
      topAgencies,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top Selling Products - from actual Export data
router.get('/top-products', auth, adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const topProducts = await Export.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productInfo.name' },
          productPrice: { $first: '$productInfo.price' },
          totalQuantity: { $sum: '$quantity' },
          salesCount: { $sum: 1 }
        }
      },
      {
        $project: {
          productName: 1,
          totalQuantity: 1,
          totalRevenue: { $multiply: ['$totalQuantity', '$productPrice'] },
          salesCount: 1,
          avgOrderValue: { $round: ['$productPrice', 2] }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ]);
    
    res.json(topProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly Comparison (Current vs Previous Year) - from actual Export data
router.get('/monthly-comparison', auth, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    
    const exports = await Export.find({
      date: {
        $gte: new Date(lastYear, 0, 1),
        $lte: new Date(currentYear, 11, 31, 23, 59, 59)
      }
    }).populate('product');
    
    // Initialize comparison data
    const comparison = {};
    for (let m = 1; m <= 12; m++) {
      const monthName = new Date(2000, m - 1).toLocaleString('en', { month: 'short' });
      comparison[m] = { 
        month: monthName, 
        current: { quantity: 0, revenue: 0 },
        previous: { quantity: 0, revenue: 0 }
      };
    }
    
    // Aggregate by month and year
    exports.forEach(exp => {
      if (!exp.product) return;
      const d = new Date(exp.date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const revenue = exp.quantity * (exp.product.price || 0);
      
      const key = year === currentYear ? 'current' : 'previous';
      comparison[month][key].quantity += exp.quantity;
      comparison[month][key].revenue += revenue;
    });
    
    const result = Object.values(comparison).map(m => ({
      month: m.month,
      currentRevenue: m.current.revenue,
      previousRevenue: m.previous.revenue,
      currentQty: m.current.quantity,
      previousQty: m.previous.quantity
    }));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agency-wise analytics
router.get('/agency-wise', auth, adminOnly, async (req, res) => {
  try {
    const agencyStats = await Export.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$agency',
          agencyName: { $first: '$agencyName' },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', '$productInfo.price'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    res.json(agencyStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agencies overview: list all agencies with aggregated order stats
router.get('/agencies-overview', auth, adminOnly, async (req, res) => {
  try {
    const agencies = await User.find({ role: 'agency' })
      .select('name email agencyName createdAt')
      .lean();

    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          lastOrderAt: { $max: '$createdAt' },
          lastDeliveryAddress: { $last: '$deliveryAddress' },
        },
      },
    ]);

    const statsMap = new Map();
    orderStats.forEach((s) => {
      statsMap.set(String(s._id), s);
    });

    const now = new Date();
    const result = agencies.map((u) => {
      const stat = statsMap.get(String(u._id)) || {};
      const totalOrders = stat.totalOrders || 0;
      const totalAmount = stat.totalAmount || 0;
      const lastOrderAt = stat.lastOrderAt || null;
      const address = stat.lastDeliveryAddress || '';
      const area = address ? address.split(',')[0].trim() : '';

      let status = 'new';
      if (totalOrders === 0) {
        status = 'new';
      } else if (lastOrderAt) {
        const diffDays = Math.floor((now - new Date(lastOrderAt)) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) status = 'active';
        else if (diffDays <= 90) status = 'warm';
        else status = 'inactive';
      }

      return {
        id: u._id,
        name: u.name,
        agencyName: u.agencyName,
        email: u.email,
        joinedAt: u.createdAt,
        totalOrders,
        totalAmount,
        lastOrderAt,
        area,
        status,
      };
    });

    // Sort by totalAmount descending by default
    result.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));

    res.json({ agencies: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
