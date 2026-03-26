const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String },
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  pincode: { type: String, required: true },
  fullAddress: { type: String },
  deliveryLat: { type: Number },
  deliveryLon: { type: Number },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'agency'], default: 'agency' },
  agencyName: { type: String },
  createdAt: { type: Date, default: Date.now },
  addresses: [addressSchema],
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
