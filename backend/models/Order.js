const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  // GST fields captured at order time to keep history even if product tax changes later
  gstRate: { type: Number, default: 0 },
  taxableValue: { type: Number },
  gstAmount: { type: Number },
  lineTotal: { type: Number }
});

const orderSchema = new mongoose.Schema({
    statusHistory: [
      {
        status: { type: String, required: true },
        label: { type: String, required: true },
        date: { type: Date, required: true }
      }
    ],
  orderNumber: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agencyName: { type: String, required: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true }, // Items total before delivery
  // Tax totals (derived from items)
  totalTax: { type: Number, default: 0 },
  totalWeight: { type: Number, default: 0 }, // Total weight in kg
  deliveryType: { 
    type: String, 
    enum: ['home_delivery', 'store_pickup'], 
    default: 'home_delivery' 
  },
  deliveryCharge: { type: Number, default: 0 },
  totalAmount: { type: Number }, // Final amount with delivery (set after approval/delivery info)
  status: {
    type: String,
    enum: ['pending', 'approved', 'awaiting_payment', 'rejected', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'collected'],
    default: 'pending'
  },
  deliveryAddress: { type: String },
  pickupCode: { type: String }, // 6-digit code for store pickup verification
  notes: { type: String },
  invoiceNumber: { type: String },
  rejectionReason: { type: String },
  
  // Payment fields
  paymentMethod: { 
    type: String, 
    enum: ['cod', 'stripe', 'bank_transfer'], 
    default: 'cod' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['unpaid', 'paid', 'partial', 'refunded', 'failed'], 
    default: 'unpaid' 
  },
  stripePaymentIntentId: { type: String },
  stripeSessionId: { type: String },
  amountPaid: { type: Number, default: 0 },
  paidAt: { type: Date },
  
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveredAt: { type: Date },
  collectedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Generate order number: ORD-YYYYMMDD-XXXX
orderSchema.statics.generateOrderNumber = async function() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;
  
  const lastOrder = await this.findOne({ orderNumber: { $regex: `^${prefix}` } })
    .sort({ orderNumber: -1 });
  
  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop());
    seq = lastSeq + 1;
  }
  
  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

// Generate invoice number: INV-YYYYMMDD-XXXX
orderSchema.statics.generateInvoiceNumber = async function() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateStr}-`;
  
  const lastOrder = await this.findOne({ invoiceNumber: { $regex: `^${prefix}` } })
    .sort({ invoiceNumber: -1 });
  
  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.invoiceNumber.split('-').pop());
    seq = lastSeq + 1;
  }
  
  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model('Order', orderSchema);
