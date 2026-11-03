const Order = require('../models/Order');
const AdminDevice = require('../models/AdminDevice');
const push = require('./push');
const { emitOrder } = require('./events');

// What the customer's phone shows for each step of their order. The service worker
// decides how loud each kind is: "ready" rings and stays on screen, the rest just buzz.
const CUSTOMER_MESSAGES = {
  accepted: (o) => ({
    title: `Order #${o.number} accepted 👨‍🍳`,
    body: o.prepMinutes ? `Your food will be ready in about ${o.prepMinutes} min. We'll ring you when it's done.` : "We're cooking it now. We'll ring you when it's done."
  }),
  delayed: (o) => ({
    title: `Order #${o.number} needs a few more minutes ⏱️`,
    body: `New time: about ${Math.max(1, Math.round((o.etaAt - Date.now()) / 60000))} min. Sorry for the wait!`
  }),
  ready: (o) => ({ title: `Order #${o.number} is ready! 🔔`, body: 'Please pick up your order from the counter.' }),
  cancelled: (o) => ({ title: `Order #${o.number} was cancelled`, body: 'Please talk to our staff at the counter — your payment will be refunded.' }),
  test: (o) => ({ title: '🔔 Alerts are on!', body: `This is how we'll ring you when order #${o.number} is ready.` })
};

// Sends one notification to every phone subscribed to the order. Returns false if no phone could get it.
async function toCustomer(orderId, kind) {
  const order = await Order.findById(orderId).select('+pushSubs');
  if (!order?.pushSubs.length) return false;
  const payload = { kind, number: order.number, trackingId: order.trackingId, url: `/order/${order.trackingId}`, ...CUSTOMER_MESSAGES[kind](order) };
  const dead = await push.send(order.pushSubs, payload, order.trackingId);
  if (!dead.length) return true;
  // The customer turned notifications off or the browser dropped the subscription
  const alive = order.pushSubs.filter((s) => !dead.includes(s.endpoint));
  const updated = await Order.findByIdAndUpdate(order._id, { $pull: { pushSubs: { endpoint: { $in: dead } } }, alertsOn: alive.length > 0 }, { returnDocument: 'after' });
  if (!alive.length && updated) emitOrder(updated);
  return alive.length > 0;
}

// Fire-and-forget version for status changes: a failed push must never fail the admin's click
const customer = (orderId, kind) => toCustomer(orderId, kind).catch((err) => console.error(`Push (${kind}) failed:`, err.message));

// "New order" alert on every admin device that turned alerts on
async function admins(order) {
  try {
    const devices = await AdminDevice.find().lean();
    if (!devices.length) return;
    const count = order.items.reduce((n, l) => n + l.qty, 0);
    const dead = await push.send(
      devices,
      {
        kind: 'new-order',
        number: order.number,
        title: `New order #${order.number} · ₹${order.total}`,
        body: `${order.customerName} · ${count} ${count === 1 ? 'item' : 'items'}${order.visit > 1 ? ` · repeat customer (${order.visit} orders)` : ''}`,
        url: '/orders'
      },
      `new-${order.number}`
    );
    if (dead.length) await AdminDevice.deleteMany({ endpoint: { $in: dead } });
  } catch (err) {
    console.error('Admin push failed:', err.message);
  }
}

module.exports = { toCustomer, customer, admins };
