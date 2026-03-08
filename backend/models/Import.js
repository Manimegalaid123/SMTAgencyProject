const mongoose = require('mongoose');

const importSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  source: { type: String, default: 'Nestlé' },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Import', importSchema);
