import api from './api';

// Web Push lets the kitchen ring the customer's phone even after they close the menu,
// and lets admin devices hear about new orders with the admin panel closed.
// Android/desktop: works in the browser. iPhone: only after "Add to Home Screen" (iOS 16.4+).

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// 'granted' | 'denied' | 'default' | 'unsupported'
export const permission = () => (pushSupported() ? Notification.permission : 'unsupported');

// Must be called from a tap (browsers ignore permission prompts that aren't)
export async function askPermission() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'default';
  }
}

const toBytes = (base64) => {
  const raw = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const sameKey = (a, b) => a && a.byteLength === b.byteLength && new Uint8Array(a).every((v, i) => v === b[i]);

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// This browser's push subscription, created if needed (permission must already be granted)
async function getSubscription() {
  const reg = await withTimeout(navigator.serviceWorker.ready, 8000);
  const { data } = await api.get('/orders/push-key');
  const key = toBytes(data.key);
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an older server key can't receive our pushes
  if (sub && !sameKey(sub.options.applicationServerKey, key)) {
    await sub.unsubscribe();
    sub = null;
  }
  return sub ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

// Subscribes this phone to the order's notifications. Returns true on success.
export async function subscribeToOrder(trackingId) {
  if (permission() !== 'granted') return false;
  try {
    const sub = await getSubscription();
    await api.post(`/orders/track/${trackingId}/push`, { subscription: sub.toJSON() });
    return true;
  } catch {
    return false;
  }
}

// Sends a real notification through the push service, so the customer hears what the alert sounds like
export const sendTestAlert = (trackingId) => api.post(`/orders/track/${trackingId}/push-test`);

// The service worker forwards every push to open pages, so an open tracking page can ring instantly
export function onPushMessage(callback) {
  if (!('serviceWorker' in navigator)) return () => {};
  const listener = (e) => e.data?.type === 'push' && callback(e.data.data);
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}

// ---------- Admin: "new order" alerts on this device ----------

const ADMIN_KEY = 'adminAlerts';

export const adminAlertsOn = () => {
  try {
    return permission() === 'granted' && localStorage.getItem(ADMIN_KEY) === '1';
  } catch {
    return false;
  }
};

export async function enableAdminAlerts() {
  const p = await askPermission();
  if (p !== 'granted') return p;
  const sub = await getSubscription();
  await api.post('/orders/admin-push', { subscription: sub.toJSON() });
  localStorage.setItem(ADMIN_KEY, '1');
  return 'granted';
}

export async function disableAdminAlerts() {
  localStorage.removeItem(ADMIN_KEY);
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  // Keep the browser subscription itself: the same phone may also be following its own order
  if (sub) await api.delete('/orders/admin-push', { data: { endpoint: sub.endpoint } });
}

export async function testAdminAlert() {
  const sub = await getSubscription();
  await api.post('/orders/admin-push/test', { endpoint: sub.endpoint });
}

// Remove the order's notification from the tray once the customer has acknowledged it
export async function clearOrderNotifications(trackingId) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const list = (await reg?.getNotifications({ tag: `order-${trackingId}` })) || [];
    list.forEach((n) => n.close());
    await navigator.clearAppBadge?.();
  } catch {
    // nothing to clear
  }
}
