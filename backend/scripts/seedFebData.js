/**
 * Seed script to add dummy export data for February 2026
 * Run: node scripts/seedFebData.js
 * 
 * This creates realistic sales data for Feb 2026 for project review purposes.
 * All future months will use real dynamic data.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Export = require('../models/Export');
const Product = require('../models/Product');

const seedFebData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB...');

    // Get all products
    const products = await Product.find();
    if (products.length === 0) {
      console.log('No products found! Add products first.');
      process.exit(1);
    }

    console.log(`Found ${products.length} products`);

    // Check if Feb 2026 data already exists
    const febStart = new Date('2026-02-01');
    const febEnd = new Date('2026-02-28');
    
    const existingFebData = await Export.countDocuments({
      date: { $gte: febStart, $lte: febEnd }
    });

    if (existingFebData > 0) {
      console.log(`Feb 2026 already has ${existingFebData} export records.`);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Do you want to delete and recreate? (y/n): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled.');
        process.exit(0);
      }
      
      // Delete existing Feb data
      await Export.deleteMany({
        date: { $gte: febStart, $lte: febEnd }
      });
      console.log('Deleted existing Feb 2026 data.');
    }

    // Generate dummy exports for February 2026
    const dummyExports = [];
    const agencies = ['ABC Retailers', 'XYZ Mart', 'Quick Shop', 'City Store', 'Metro Mart'];
    
    // Create 15-25 exports spread across February
    for (let day = 1; day <= 28; day++) {
      // Random: some days have sales, some don't
      const salesThisDay = Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
      
      for (let i = 0; i < salesThisDay; i++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomAgency = agencies[Math.floor(Math.random() * agencies.length)];
        const quantity = Math.floor(Math.random() * 100) + 10; // 10-110 units
        
        const dateStr = `2026-02-${day.toString().padStart(2, '0')}T10:00:00.000Z`;
        const exportDate = new Date(dateStr);
        
        dummyExports.push({
          product: randomProduct._id,
          quantity: quantity,
          date: exportDate,
          agencyName: randomAgency,
          notes: 'Seeded data for Feb 2026',
          createdAt: exportDate
        });
      }
    }

    // Insert all dummy exports
    if (dummyExports.length > 0) {
      await Export.insertMany(dummyExports);
      console.log(`\n✅ Successfully created ${dummyExports.length} export records for February 2026!`);
      
      // Show summary
      const summary = {};
      for (const exp of dummyExports) {
        const prod = products.find(p => p._id.equals(exp.product));
        const name = prod?.name || 'Unknown';
        if (!summary[name]) summary[name] = { qty: 0, count: 0 };
        summary[name].qty += exp.quantity;
        summary[name].count += 1;
      }
      
      console.log('\n📊 February 2026 Sales Summary:');
      console.log('--------------------------------');
      for (const [name, data] of Object.entries(summary)) {
        console.log(`  ${name}: ${data.qty} units (${data.count} transactions)`);
      }
    } else {
      console.log('No exports generated.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedFebData();
