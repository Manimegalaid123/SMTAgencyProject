const mongoose = require('mongoose');

const exportSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  agency: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agencyName: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Export', exportSchema);
