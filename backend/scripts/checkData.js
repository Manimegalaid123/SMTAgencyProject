require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Export = require('../models/Export');
const Product = require('../models/Product');

async function checkData() {
  await connectDB();
  
  // Get all products
  const products = await Product.find();
  console.log('\n📦 Products in database:');
  products.forEach(p => console.log(`  - ${p.name} | Price: ₹${p.price} | ID: ${p._id}`));
  
  // Get export totals by product
  const exportTotals = await Export.aggregate([
    { $group: { _id: '$product', totalQty: { $sum: '$quantity' }, count: { $sum: 1 } } }
  ]);
  
  console.log('\n📊 Export totals by product (from Export collection):');
  for (const e of exportTotals) {
    const prod = products.find(x => x._id.equals(e._id));
    const price = prod?.price || 0;
    const revenue = e.totalQty * price;
    console.log(`  - ${prod?.name || 'Unknown'} | Qty: ${e.totalQty} | Transactions: ${e.count} | Revenue: ₹${revenue.toLocaleString()}`);
  }
  
  // Check for milkmaid specifically
  const milkmaid = products.find(p => p.name.toLowerCase().includes('milk'));
  if (milkmaid) {
    console.log('\n🥛 Milkmaid exports details:');
    const milkmaidExports = await Export.find({ product: milkmaid._id });
    console.log(`  Found ${milkmaidExports.length} export records`);
    let total = 0;
    milkmaidExports.forEach(e => {
      console.log(`    - Date: ${e.date.toISOString().split('T')[0]} | Qty: ${e.quantity}`);
      total += e.quantity;
    });
    console.log(`  Total milkmaid quantity: ${total}`);
  }
  
  process.exit(0);
}

checkData().catch(console.error);
