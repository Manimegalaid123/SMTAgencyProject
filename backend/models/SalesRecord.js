const mongoose = require('mongoose');

const salesRecordSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  quantity: { type: Number, required: true },
  revenue: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

salesRecordSchema.index({ product: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SalesRecord', salesRecordSchema);
