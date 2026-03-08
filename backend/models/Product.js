const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'FMCG' },
  price: { type: Number, required: true },
  availableQuantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 50 }, // Alert when below this
  unit: { type: String, default: 'units' },
  weight: { type: Number, default: 1 }, // Weight per unit in kg
  description: { type: String },
  status: { type: String, enum: ['Available', 'Out of Stock', 'Low Stock'], default: 'Available' },
  importSource: { type: String, default: 'Nestlé' },
  createdAt: { type: Date, default: Date.now },
});

// Auto-update status based on quantity
productSchema.pre('save', function(next) {
  if (this.availableQuantity <= 0) {
    this.status = 'Out of Stock';
  } else if (this.availableQuantity <= this.lowStockThreshold) {
    this.status = 'Low Stock';
  } else {
    this.status = 'Available';
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
