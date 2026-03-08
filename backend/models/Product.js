const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'FMCG' },
  price: { type: Number, required: true },
  availableQuantity: { type: Number, default: 0 },
  unit: { type: String, default: 'units' },
  description: { type: String },
  status: { type: String, enum: ['Available', 'Out of Stock'], default: 'Available' },
  importSource: { type: String, default: 'Nestlé' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);
