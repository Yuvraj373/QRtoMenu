const webpush = require('web-push');
const mongoose = require('mongoose');

// Web Push needs a VAPID key pair that never changes (phones' subscriptions are tied to it).
// Use VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY if set, otherwise generate a pair once and keep it in MongoDB.
let keyPromise;

function init() {
  keyPromise ??= (async () => {
    let keys;
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    } else {
      const config = mongoose.connection.collection('config');
      await config.updateOne({ _id: 'vapid' }, { $setOnInsert: webpush.generateVAPIDKeys() }, { upsert: true });
      const doc = await config.findOne({ _id: 'vapid' });
      keys = { publicKey: doc.publicKey, privateKey: doc.privateKey };
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:orders@qrmenu.app', keys.publicKey, keys.privateKey);
    return keys.publicKey;
  })().catch((err) => {
    keyPromise = null;
    throw err;
  });
  return keyPromise;
}

const publicKey = () => init();

// Sends to every phone subscribed to the order; returns endpoints that are gone for good
async function send(subscriptions, payload, topic) {
  await init();
  const dead = [];
  await Promise.all(
    subscriptions.map((sub) =>
      webpush
        .sendNotification(sub, JSON.stringify(payload), { TTL: 120, urgency: 'high', topic })
        .catch((err) => {
          if (err.statusCode === 404 || err.statusCode === 410) dead.push(sub.endpoint);
          else console.error('Push failed:', err.statusCode || err.message);
        })
    )
  );
  return dead;
}

module.exports = { publicKey, send };
