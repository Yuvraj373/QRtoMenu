const mongoose = require('mongoose');

const STATUSES = ['new', 'preparing', 'ready', 'served', 'cancelled'];

const lineSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name: { type: String, required: true },
  size: { type: String, enum: ['M', 'L', null], default: null },
  price: { type: Number, required: true, min: 0 },
  qty: { type: Number, required: true, min: 1 },
  image: { type: String, default: '' },
  isFree: { type: Boolean, default: false }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  number: { type: Number, required: true, index: true },
  // Unguessable id the customer uses to follow their order; never the Mongo _id
  trackingId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true, trim: true, maxlength: 60 },
  table: { type: String, required: true, trim: true, maxlength: 20 },
  phone: { type: String, default: '', trim: true, maxlength: 20 },
  note: { type: String, default: '', trim: true, maxlength: 300 },
  items: { type: [lineSchema], validate: [(v) => v.length > 0, 'Order has no items'] },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  freeGift: { type: Boolean, default: false },
  status: { type: String, enum: STATUSES, default: 'new', index: true },
  // Demo payment: no money moves, only a masked reference is stored
  payment: {
    status: { type: String, enum: ['paid'], default: 'paid' },
    method: { type: String, enum: ['upi', 'card'], required: true },
    masked: { type: String, default: '' },
    ref: { type: String, default: '' },
    paidAt: { type: Date, default: Date.now }
  },
  review: {
    rating: { type: Number, min: 1, max: 5 },
    at: Date
  }
}, { timestamps: true });

orderSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Order', orderSchema);
