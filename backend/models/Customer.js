const mongoose = require('mongoose');

// One record per mobile number, so repeat orders from the same person are linked together
const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  orderCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  firstOrderAt: Date,
  lastOrderAt: { type: Date, index: true }
}, { timestamps: true });

// Indian mobile numbers: accepts "+91 98765 43210", "098765 43210" etc. Returns 10 digits or null.
customerSchema.statics.normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

// Called for every new order: creates the customer the first time, then just adds to their totals
customerSchema.statics.recordOrder = function ({ phone, name, total, at = new Date() }) {
  return this.findOneAndUpdate(
    { phone },
    { $set: { name }, $inc: { orderCount: 1, totalSpent: total }, $min: { firstOrderAt: at }, $max: { lastOrderAt: at } },
    { upsert: true, returnDocument: 'after' }
  );
};

module.exports = mongoose.model('Customer', customerSchema);
