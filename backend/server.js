require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const importRoutes = require('./routes/imports');
const exportRoutes = require('./routes/exports');
const stockRoutes = require('./routes/stock');
const requestRoutes = require('./routes/requests');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');
const mlRoutes = require('./routes/ml');
const paymentRoutes = require('./routes/payments');

const app = express();
app.use(cors({ origin: true, credentials: true }));

// Stripe webhook needs raw body, so we handle it before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smt_agency';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
