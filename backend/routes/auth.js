const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.patch('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current password and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated. Please log in again.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const SMT_ADMIN_EMAIL = 'adminsmt@gmail.com';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, agencyName } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (req.body.role && req.body.role !== 'agency') return res.status(400).json({ error: 'Invalid request. Signup is for agencies only.' });
    const emailNormalized = String(email).trim().toLowerCase();
    if (emailNormalized === SMT_ADMIN_EMAIL) return res.status(400).json({ error: 'This email is reserved for SMT Admin. Please use a different email to register as an agency.' });
    const existing = await User.findOne({ email: emailNormalized });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ name, email: emailNormalized, password, role: 'agency', agencyName: agencyName || name });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, agencyName: user.agencyName },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const emailNormalized = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNormalized });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.role !== 'admin' && user.role !== 'agency') return res.status(403).json({ error: 'Unauthorized role access' });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, agencyName: user.agencyName },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
