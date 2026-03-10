const mongoose = require('mongoose');

const productRequestSchema = new mongoose.Schema({
  // Old fields (kept for backward compatibility)
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number },
  
  // New Enquiry fields
  subject: { type: String, required: true },
  message: { type: String, required: true },
  adminReply: { type: String },
  repliedAt: { type: Date },
  
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agencyName: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['pending', 'replied', 'closed'], default: 'pending' },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ProductRequest', productRequestSchema);
