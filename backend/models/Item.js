const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  priceM: { type: Number, required: true, min: 0 },
  priceL: { type: Number, default: null, min: 0 },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  image: { type: String, default: '', trim: true, match: [/^(https?:\/\/\S+)?$/, 'Image must be an http(s) URL'] },
  isVeg: { type: Boolean, default: true },
  isSpecial: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
