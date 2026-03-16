const mongoose = require('mongoose');

const stockBatchSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  manufactureDate: { type: Date },
  expiryDate: { type: Date, required: true },
  source: { type: String, default: 'Nestlé' },
  notes: { type: String },
  importedAt: { type: Date, default: Date.now },
  exhaustedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StockBatch', stockBatchSchema);
