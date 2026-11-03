const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });

// Atomic sequence, so two orders placed at the same moment never share a number
counterSchema.statics.next = async function (name) {
  const doc = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
