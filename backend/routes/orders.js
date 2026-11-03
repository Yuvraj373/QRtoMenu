const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Counter = require('../models/Counter');
const { protect } = require('../middleware/auth');
const { bus, openStream } = require('../lib/events');
const { FREE_GIFT_MIN, FREE_GIFT_NAME } = require('../lib/offer');

const router = express.Router();

// Customers at one restaurant often share the same Wi-Fi IP, so this is generous
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many orders from this network. Please wait a few minutes.' }
});

const ACTIVE = ['new', 'preparing', 'ready'];

// What the customer is allowed to see about their own order
const publicView = (o) => ({
  number: o.number,
  trackingId: o.trackingId,
  customerName: o.customerName,
  table: o.table,
  items: o.items,
  subtotal: o.subtotal,
  total: o.total,
  freeGift: o.freeGift,
  status: o.status,
  payment: { method: o.payment.method, masked: o.payment.masked, ref: o.payment.ref, paidAt: o.payment.paidAt },
  review: o.review?.at ? o.review : null,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt
});

const broadcast = (order) => bus.emit('order', order.toObject ? order.toObject() : order);

// Demo payment check: any UPI id / 10-digit number, or a 12–19 digit card number
function readPayment(p = {}) {
  const value = String(p.value || '').trim();
  if (p.method === 'upi') {
    const digits = value.replace(/\D/g, '');
    if (/^[\w.-]{2,}@[a-z]{2,}$/i.test(value)) return { method: 'upi', masked: value.replace(/^(.{2}).*(@.*)$/, '$1•••$2') };
    if (digits.length === 10) return { method: 'upi', masked: `••••••${digits.slice(-4)}` };
    return null;
  }
  if (p.method === 'card') {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 12 && digits.length <= 19) return { method: 'card', masked: `•••• ${digits.slice(-4)}` };
  }
  return null;
}

// ---------- Customer ----------

router.post('/', orderLimiter, async (req, res) => {
  const { customerName, table, phone, note, items, payment } = req.body || {};
  if (!String(customerName || '').trim()) return res.status(400).json({ error: 'Please enter your name' });
  if (!String(table || '').trim()) return res.status(400).json({ error: 'Please enter your table number' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your cart is empty' });
  if (items.length > 40) return res.status(400).json({ error: 'Too many items in one order' });

  const paid = readPayment(payment);
  if (!paid) return res.status(400).json({ error: payment?.method === 'card' ? 'Enter a valid card number' : 'Enter a valid UPI ID or mobile number' });

  // Prices always come from the database, never from the browser
  const ids = items.map((l) => l.id).filter((id) => mongoose.isValidObjectId(id));
  const menu = new Map((await Item.find({ _id: { $in: ids } }).lean()).map((i) => [String(i._id), i]));
  const lines = [];
  for (const l of items) {
    const item = menu.get(String(l.id));
    const qty = Math.floor(Number(l.qty));
    if (!item) return res.status(400).json({ error: 'An item in your cart is no longer on the menu. Please refresh.' });
    if (item.isAvailable === false) return res.status(400).json({ error: `${item.name} is sold out` });
    if (!(qty >= 1 && qty <= 20)) return res.status(400).json({ error: `Invalid quantity for ${item.name}` });
    const size = item.priceL != null ? (l.size === 'L' ? 'L' : 'M') : null;
    const price = size === 'L' ? item.priceL : item.priceM;
    lines.push({ item: item._id, name: item.name, size, price, qty, image: item.image });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const freeGift = subtotal >= FREE_GIFT_MIN;
  if (freeGift) {
    const gift = (await Item.findOne({ name: new RegExp(`^${FREE_GIFT_NAME}$`, 'i') }).lean()) || {};
    lines.push({ item: gift._id, name: FREE_GIFT_NAME, size: null, price: 0, qty: 1, image: gift.image || '', isFree: true });
  }

  const order = await Order.create({
    number: 1000 + (await Counter.next('order')),
    trackingId: crypto.randomBytes(12).toString('base64url'),
    customerName,
    table,
    phone,
    note,
    items: lines,
    subtotal,
    total: subtotal,
    freeGift,
    payment: { ...paid, ref: `DEMO${Date.now().toString(36).toUpperCase()}` }
  });
  broadcast(order);
  res.status(201).json(publicView(order));
});

const findTracked = async (req, res, next) => {
  const order = await Order.findOne({ trackingId: String(req.params.trackingId) });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  req.order = order;
  next();
};

router.get('/track/:trackingId', findTracked, (req, res) => res.json(publicView(req.order)));

// Live status for the customer's own order
router.get('/track/:trackingId/stream', findTracked, (req, res) => {
  const send = openStream(req, res);
  send('order', publicView(req.order));
  const onOrder = (o) => o.trackingId === req.order.trackingId && send('order', publicView(o));
  bus.on('order', onOrder);
  req.on('close', () => bus.off('order', onOrder));
});

router.post('/track/:trackingId/review', findTracked, async (req, res) => {
  const rating = Math.round(Number(req.body?.rating));
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Please choose a rating' });
  req.order.review = { rating, at: new Date() };
  await req.order.save();
  broadcast(req.order);
  res.json(publicView(req.order));
});

// ---------- Admin ----------

// Today's orders (since the admin's local midnight) plus anything still in progress
router.get('/', protect, async (req, res) => {
  const since = new Date(req.query.since);
  const from = isNaN(since) ? new Date(Date.now() - 24 * 3600 * 1000) : since;
  const orders = await Order.find({ $or: [{ createdAt: { $gte: from } }, { status: { $in: ACTIVE } }] }).sort({ createdAt: -1 }).limit(500).lean();
  res.json(orders);
});

router.get('/stream', protect, (req, res) => {
  const send = openStream(req, res);
  send('ready', { at: Date.now() });
  const onOrder = (o) => send('order', o);
  bus.on('order', onOrder);
  req.on('close', () => bus.off('order', onOrder));
});

router.patch('/:id/status', protect, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid order id' });
  if (!Order.STATUSES.includes(req.body?.status)) return res.status(400).json({ error: 'Invalid status' });
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after', runValidators: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  broadcast(order);
  res.json(order);
});

module.exports = router;
