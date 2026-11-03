const Order = require('../models/Order');
const notify = require('./notify');

// A push notification only buzzes once, so while an order waits at the counter we keep
// re-sending it until the customer taps "OK, I'm coming": quickly at first, then calmer.
// Seconds after "ready" — 10 rings over ~6 minutes.
const SCHEDULE = [0, 15, 30, 50, 75, 105, 150, 210, 280, 360];
const timers = new Map();

const acked = (o) => o.pickupAck && o.pickupAck >= o.readyAt;

function stop(orderId) {
  clearTimeout(timers.get(String(orderId))?.timer);
  timers.delete(String(orderId));
}

function start(orderId) {
  const id = String(orderId);
  stop(id);
  const begin = Date.now();
  // Each start() gets its own token, so a stop() or a newer start() ends this chain even mid-ring
  const token = {};
  timers.set(id, token);
  const ring = async (i) => {
    if (timers.get(id) !== token) return;
    try {
      const order = await Order.findById(id).lean();
      if (!order || order.status !== 'ready' || acked(order)) return timers.get(id) === token && stop(id);
      await notify.toCustomer(id, 'ready');
    } catch (err) {
      console.error('Pickup ring failed:', err.message);
    }
    if (timers.get(id) !== token) return;
    if (i + 1 >= SCHEDULE.length) return stop(id);
    token.timer = setTimeout(() => ring(i + 1), Math.max(0, begin + SCHEDULE[i + 1] * 1000 - Date.now()));
  };
  ring(0);
}

module.exports = { start, stop };
