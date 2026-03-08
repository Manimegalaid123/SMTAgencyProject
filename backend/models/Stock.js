const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Stock', stockSchema);
