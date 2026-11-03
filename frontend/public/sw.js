// Service worker: shows order notifications even when the menu tab or the browser is
// closed, and handles the buttons on them.
//   ready      → loud, long vibration, stays on screen until tapped, "OK, I'm coming" button
//   accepted / delayed / cancelled / test → normal buzz
//   new-order  → admin devices: a new order came in

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const RING = [800, 250, 800, 250, 800, 250, 800, 250, 800];
const BUZZ = [200, 100, 200];

function optionsFor(data) {
  const kind = data.kind || 'ready';
  const base = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data,
    timestamp: Date.now(),
  };
  if (kind === 'new-order') {
    return { ...base, tag: `new-order-${data.number || ''}`, renotify: true, requireInteraction: true, vibrate: [400, 150, 400, 150, 400], actions: [{ action: 'open', title: 'Open orders' }] };
  }
  // One notification per order: each update replaces the previous one and buzzes again
  const order = { ...base, tag: `order-${data.trackingId || 'order'}`, renotify: true };
  if (kind === 'ready') {
    return { ...order, requireInteraction: true, vibrate: RING, actions: data.trackingId ? [{ action: 'ack', title: "OK, I'm coming 👍" }] : [] };
  }
  return { ...order, vibrate: BUZZ, requireInteraction: kind === 'cancelled' };
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Your order is ready!', body: event.data?.text() };
  }
  const shown = self.registration.showNotification(data.title || 'Your order is ready! 🔔', optionsFor(data));
  // Red dot on the home-screen icon (installed app) while the order waits at the counter
  const badge = data.kind === 'ready' && self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => {}) : null;
  // Tell an open tracking page to ring right away, without waiting for its live stream
  const tell = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => list.forEach((c) => c.postMessage({ type: 'push', data })));
  event.waitUntil(Promise.all([shown, badge, tell]));
});

self.addEventListener('notificationclick', (event) => {
  const { trackingId, url = '/' } = event.notification.data || {};
  event.notification.close();

  if (event.action === 'ack' && trackingId) {
    event.waitUntil(
      Promise.all([
        fetch(`/api/orders/track/${encodeURIComponent(trackingId)}/pickup-ack`, { method: 'POST' }).catch(() => {}),
        self.navigator.clearAppBadge?.().catch(() => {}),
      ])
    );
    return;
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).pathname === url);
      if (open) return open.focus();
      return self.clients.openWindow(url);
    })()
  );
});
