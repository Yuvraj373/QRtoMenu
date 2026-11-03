const mongoose = require('mongoose');

// Admin phones/laptops that asked for "new order" push alerts, so the kitchen hears
// about orders even when the admin panel is closed
const adminDeviceSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  expirationTime: Number,
  keys: { p256dh: String, auth: String }
}, { timestamps: true });

module.exports = mongoose.model('AdminDevice', adminDeviceSchema);
