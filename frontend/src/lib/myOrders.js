// Orders placed from this phone, so the customer can get back to tracking them
const KEY = 'myOrders';
const MAX_AGE = 12 * 3600 * 1000;

export function getMyOrders() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY)) || [];
    return list.filter((o) => Date.now() - o.at < MAX_AGE);
  } catch {
    return [];
  }
}

export function rememberOrder(order) {
  try {
    const list = [{ trackingId: order.trackingId, number: order.number, at: Date.now() }, ...getMyOrders()].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage unavailable (private mode): tracking still works from the current page
  }
}
