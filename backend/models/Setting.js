const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'PizzaSter', trim: true },
  tagline: { type: String, default: 'Pure Veg', trim: true },
  themeColor: { type: String, default: '#ef4444', match: /^#[0-9a-fA-F]{6}$/ },
  address: { type: String, default: '123, Food Street', trim: true },
  phone: { type: String, default: '9876543210', trim: true },
  since: { type: String, default: 'Since 2021', trim: true },
  // Public address of the live menu; printed in the QR code
  menuUrl: { type: String, default: '', trim: true, match: [/^(https?:\/\/\S+)?$/, 'Menu link must start with http:// or https://'] }
});

// Single-document collection: always read/write the same settings doc
settingSchema.statics.getSingleton = async function () {
  return (await this.findOne()) || this.create({});
};

module.exports = mongoose.model('Setting', settingSchema);
