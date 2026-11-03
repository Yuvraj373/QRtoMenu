const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Counter = require('../models/Counter');
const Customer = require('../models/Customer');
const AdminDevice = require('../models/AdminDevice');
const { protect } = require('../middleware/auth');
const { bus, openStream, emitOrder: broadcast } = require('../lib/events');
const { FREE_GIFT_MIN, FREE_GIFT_NAME } = require('../lib/offer');
const push = require('../lib/push');
const notify = require('../lib/notify');
const ringer = require('../lib/pickupRinger');

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
const REVIEW_TAGS = ['Tasty food', 'Quick service', 'Good value', 'Friendly staff', 'Hot & fresh', 'Big portions'];
const clampMinutes = (v, fallback) => Math.min(180, Math.max(1, Math.round(Number(v)) || fallback));

// What the customer is allowed to see about their own order
const publicView = (o) => ({
  number: o.number,
  trackingId: o.trackingId,
  customerName: o.customerName,
  visit: o.visit || 1,
  items: o.items,
  subtotal: o.subtotal,
  total: o.total,
  freeGift: o.freeGift,
  status: o.status,
  prepMinutes: o.prepMinutes || null,
  etaAt: o.etaAt || null,
  payment: { method: o.payment.method, masked: o.payment.masked, ref: o.payment.ref, paidAt: o.payment.paidAt },
  readyAt: o.readyAt || null,
  pickupAck: o.pickupAck || null,
  review: o.review?.at ? o.review : null,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt
});

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

// Public key the browser needs to subscribe to push notifications
router.get('/push-key', async (req, res) => {
  res.json({ key: await push.publicKey() });
});

// Star rating and recent comments for the menu page (first names only)
router.get('/reviews', async (req, res) => {
  const [stats] = await Order.aggregate([
    { $match: { 'review.rating': { $gte: 1 } } },
    { $group: { _id: null, avg: { $avg: '$review.rating' }, count: { $sum: 1 } } }
  ]);
  const recent = await Order.find({ 'review.rating': { $gte: 4 }, 'review.comment': { $nin: [null, ''] } })
    .sort({ 'review.at': -1 })
    .limit(6)
    .select('customerName review')
    .lean();
  res.json({
    avg: stats ? Math.round(stats.avg * 10) / 10 : null,
    count: stats?.count || 0,
    recent: recent.map((o) => ({ name: o.customerName.split(' ')[0], rating: o.review.rating, tags: o.review.tags, comment: o.review.comment, at: o.review.at }))
  });
});

router.post('/', orderLimiter, async (req, res) => {
  const { customerName, phone: rawPhone, note, items, payment } = req.body || {};
  if (!String(customerName || '').trim()) return res.status(400).json({ error: 'Please enter your name' });
  // The mobile number links every order from the same person (and lets the counter call them)
  const phone = Customer.normalizePhone(rawPhone);
  if (!phone) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
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

  const customer = await Customer.recordOrder({ phone, name: String(customerName).trim(), total: subtotal });
  const order = await Order.create({
    number: 1000 + (await Counter.next('order')),
    trackingId: crypto.randomBytes(12).toString('base64url'),
    customerName,
    phone,
    customer: customer._id,
    visit: customer.orderCount,
    note,
    items: lines,
    subtotal,
    total: subtotal,
    freeGift,
    payment: { ...paid, ref: `DEMO${Date.now().toString(36).toUpperCase()}` }
  });
  broadcast(order);
  notify.admins(order);
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
  const tags = [...new Set(Array.isArray(req.body.tags) ? req.body.tags : [])].filter((t) => REVIEW_TAGS.includes(t));
  const comment = String(req.body.comment || '').trim().slice(0, 500);
  req.order.review = { rating, tags, comment, at: new Date() };
  await req.order.save();
  broadcast(req.order);
  res.json(publicView(req.order));
});

// The customer's phone allows notifications: remember it so we can ring it when the order is ready
router.post('/track/:trackingId/push', findTracked, async (req, res) => {
  const sub = req.body?.subscription || {};
  const valid = /^https:\/\/\S+$/.test(sub.endpoint || '') && typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string';
  if (!valid) return res.status(400).json({ error: 'Invalid push subscription' });
  const clean = { endpoint: sub.endpoint, expirationTime: sub.expirationTime ?? null, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
  await Order.updateOne({ _id: req.order._id }, { $pull: { pushSubs: { endpoint: clean.endpoint } } });
  const order = await Order.findByIdAndUpdate(req.order._id, { $push: { pushSubs: { $each: [clean], $slice: -3 } }, alertsOn: true }, { returnDocument: 'after' });
  if (!req.order.alertsOn) broadcast(order);
  // Subscribed after the order was already marked ready: ring now
  if (order.status === 'ready' && !(order.pickupAck >= order.readyAt)) ringer.start(order._id);
  res.json({ ok: true });
});

// "Send a test alert" button: proves to the customer that their phone will ring
const lastTest = new Map();
router.post('/track/:trackingId/push-test', findTracked, async (req, res) => {
  const id = req.order.trackingId;
  if (lastTest.has(id)) return res.status(429).json({ error: 'Please wait a few seconds before testing again' });
  const ok = await notify.toCustomer(req.order._id, 'test');
  if (!ok) return res.status(409).json({ error: 'This phone is not subscribed to alerts. Turn alerts on first.' });
  lastTest.set(id, setTimeout(() => lastTest.delete(id), 15000));
  res.json({ ok: true });
});

// Customer tapped "OK, I'm coming" on the pickup alert: stop ringing
router.post('/track/:trackingId/pickup-ack', findTracked, async (req, res) => {
  req.order.pickupAck = new Date();
  await req.order.save();
  ringer.stop(req.order._id);
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
  const { status } = req.body || {};
  if (!Order.STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const update = { status };
  // Accepting sets the time the customer sees ("ready in 15 min")
  if (status === 'preparing') {
    const prepMinutes = clampMinutes(req.body.prepMinutes, 15);
    Object.assign(update, { prepMinutes, etaAt: new Date(Date.now() + prepMinutes * 60000) });
  }
  // Ready = start ringing the customer's phone
  if (status === 'ready') Object.assign(update, { readyAt: new Date(), pickupAck: null });
  const before = await Order.findByIdAndUpdate(req.params.id, update, { runValidators: true });
  if (!before) return res.status(404).json({ error: 'Order not found' });
  const order = await Order.findById(before._id);
  if (status === 'ready') ringer.start(order._id);
  else ringer.stop(order._id);
  if (before.status !== status) {
    if (status === 'preparing') notify.customer(order._id, 'accepted');
    if (status === 'cancelled') notify.customer(order._id, 'cancelled');
    // Refunded orders don't count towards what the customer has spent
    if (order.customer && [before.status, status].includes('cancelled')) {
      await Customer.updateOne({ _id: order.customer }, { $inc: { totalSpent: status === 'cancelled' ? -order.total : order.total } });
    }
  }
  broadcast(order);
  res.json(order);
});

// Kitchen is running late: push the promised time back and tell the customer
router.post('/:id/delay', protect, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid order id' });
  const order = await Order.findOne({ _id: req.params.id, status: 'preparing' });
  if (!order) return res.status(404).json({ error: 'Order is not being prepared' });
  const add = clampMinutes(req.body?.minutes, 5);
  order.etaAt = new Date(Math.max(order.etaAt?.getTime() || 0, Date.now()) + add * 60000);
  order.prepMinutes = (order.prepMinutes || 0) + add;
  await order.save();
  notify.customer(order._id, 'delayed');
  broadcast(order);
  res.json(order);
});

// Customer hasn't come to the counter yet: ring their phone again
router.post('/:id/ring', protect, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid order id' });
  const order = await Order.findOneAndUpdate({ _id: req.params.id, status: 'ready' }, { readyAt: new Date(), pickupAck: null }, { returnDocument: 'after' });
  if (!order) return res.status(404).json({ error: 'Order is not waiting for pickup' });
  ringer.start(order._id);
  broadcast(order);
  res.json(order);
});

// ---------- Admin devices: "new order" alerts even when the admin panel is closed ----------

router.post('/admin-push', protect, async (req, res) => {
  const sub = req.body?.subscription || {};
  const valid = /^https:\/\/\S+$/.test(sub.endpoint || '') && typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string';
  if (!valid) return res.status(400).json({ error: 'Invalid push subscription' });
  await AdminDevice.updateOne(
    { endpoint: sub.endpoint },
    { endpoint: sub.endpoint, expirationTime: sub.expirationTime ?? null, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    { upsert: true }
  );
  res.json({ ok: true, devices: await AdminDevice.countDocuments() });
});

router.delete('/admin-push', protect, async (req, res) => {
  await AdminDevice.deleteOne({ endpoint: String(req.body?.endpoint || '') });
  res.json({ ok: true });
});

router.post('/admin-push/test', protect, async (req, res) => {
  const device = await AdminDevice.findOne({ endpoint: String(req.body?.endpoint || '') }).lean();
  if (!device) return res.status(404).json({ error: 'This device has no alerts turned on' });
  const dead = await push.send([device], { kind: 'new-order', title: '🔔 New-order alerts are on', body: 'This device will ring for every new order, even with the admin panel closed.', url: '/orders' }, 'admin-test');
  if (dead.length) {
    await AdminDevice.deleteOne({ endpoint: device.endpoint });
    return res.status(410).json({ error: 'This device stopped accepting alerts. Turn them on again.' });
  }
  res.json({ ok: true });
});

module.exports = router;
