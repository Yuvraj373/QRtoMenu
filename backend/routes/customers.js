const express = require('express');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Everyone who has ordered, most recent first; ?q= searches name or mobile number
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const digits = q.replace(/\D/g, '');
  const filter = q ? { $or: [{ name: new RegExp(escape(q), 'i') }, ...(digits.length >= 3 ? [{ phone: new RegExp(digits) }] : [])] } : {};
  const customers = await Customer.find(filter).sort({ lastOrderAt: -1 }).limit(300).lean();
  const ratings = await Order.aggregate([
    { $match: { customer: { $in: customers.map((c) => c._id) }, 'review.rating': { $gte: 1 } } },
    { $group: { _id: '$customer', avg: { $avg: '$review.rating' } } }
  ]);
  const avg = new Map(ratings.map((r) => [String(r._id), Math.round(r.avg * 10) / 10]));
  res.json(customers.map((c) => ({ ...c, avgRating: avg.get(String(c._id)) ?? null })));
});

// One customer with every order they have placed
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid customer id' });
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const orders = await Order.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ customer, orders });
});

module.exports = router;
