const Order = require('../models/Order');
const Customer = require('../models/Customer');

// One-time upgrade for orders placed before customers existed: link every old order
// that has a valid mobile number to its customer. Does nothing once all are linked.
module.exports = async function linkCustomers() {
  const orders = await Order.find({ customer: { $exists: false }, phone: { $nin: [null, ''] } }).sort({ createdAt: 1 }).lean();
  let linked = 0;
  for (const o of orders) {
    const phone = Customer.normalizePhone(o.phone);
    if (!phone) continue;
    const c = await Customer.recordOrder({ phone, name: o.customerName, total: o.status === 'cancelled' ? 0 : o.total, at: o.createdAt });
    await Order.updateOne({ _id: o._id }, { customer: c._id, phone, visit: c.orderCount });
    linked += 1;
  }
  if (linked) console.log(`👥 Linked ${linked} earlier orders to customers`);
};
