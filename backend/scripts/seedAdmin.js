require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Stock = require('../models/Stock');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smt_agency';

// Fixed SMT Admin credentials (single admin account, not created via signup)
const SMT_ADMIN_EMAIL = 'adminsmt@gmail.com';
const SMT_ADMIN_PASSWORD = 'adminsmt@123';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  let admin = await User.findOne({ email: SMT_ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      name: 'SMT Agency Admin',
      email: SMT_ADMIN_EMAIL,
      password: SMT_ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log(`SMT Agency Admin created: ${SMT_ADMIN_EMAIL} (only admin in system).`);
  } else {
    console.log(`SMT Admin already exists: ${SMT_ADMIN_EMAIL} (no duplicate created).`);
  }
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount > 1) {
    console.warn('Warning: Multiple admin users exist. SMT Agency should be the only admin.');
  }
  if ((await Product.countDocuments()) === 0) {
    const products = [
      { name: 'Maggi Noodles', price: 12, category: 'FMCG' },
      { name: 'Nescafe Coffee', price: 180, category: 'FMCG' },
      { name: 'KitKat Chocolate', price: 20, category: 'FMCG' },
      { name: 'Milkmaid', price: 45, category: 'FMCG' },
    ];
    for (const p of products) {
      const prod = await Product.create(p);
      await Stock.create({ product: prod._id, quantity: 100 });
    }
    console.log('Sample products and stock created');
  }
  await mongoose.disconnect();
  console.log('Seed done');
}

seed().catch(console.error);
