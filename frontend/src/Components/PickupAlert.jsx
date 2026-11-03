import { useEffect, useState } from 'react';
import Sheet from './Sheet';
import api from '../lib/api';
import { playRing, unlockSound } from '../lib/sound';
import { clearOrderNotifications } from '../lib/push';
import { BellIcon } from './Icons';

// Rings and vibrates the phone until the customer taps OK
export default function PickupAlert({ order, onAck }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ring = () => {
      playRing();
      navigator.vibrate?.([500, 200, 500, 200, 500]);
    };
    ring();
    const timer = setInterval(ring, 3000);
    // Flash the tab title in case the customer is on another tab
    const title = document.title;
    let flip = false;
    const flash = setInterval(() => {
      flip = !flip;
      document.title = flip ? '🔔 Your order is ready!' : title;
    }, 1000);
    return () => {
      clearInterval(timer);
      clearInterval(flash);
      document.title = title;
      navigator.vibrate?.(0);
    };
  }, [order.readyAt]);

  const ack = async () => {
    setBusy(true);
    unlockSound();
    clearOrderNotifications(order.trackingId);
    // Stop ringing straight away; the server copy follows
    onAck({ ...order, pickupAck: new Date().toISOString() });
    try {
      const res = await api.post(`/orders/track/${order.trackingId}/pickup-ack`);
      onAck(res.data);
    } catch {
      // the alert is already dismissed locally; nothing else to do
    }
  };

  return (
    <Sheet open dismissable={false}>
      <div className="relative overflow-hidden px-6 pt-12 pb-8 text-center bg-gradient-to-b from-green-500 to-green-600 text-white">
        <span className="absolute inset-0 m-auto w-40 h-40 rounded-full bg-white/20 animate-ping" />
        <span className="relative inline-grid place-items-center w-24 h-24 rounded-full bg-white text-green-600 shadow-2xl animate-ring">
          <BellIcon className="w-12 h-12" />
        </span>
        <p className="relative mt-6 text-sm font-bold uppercase tracking-[0.2em] text-white/80">Order #{order.number}</p>
        <h2 className="relative mt-1 text-3xl font-extrabold leading-tight">Your order is ready! 🎉</h2>
      </div>
      <div className="px-6 py-7 text-center">
        <p className="text-xl font-extrabold text-stone-900">Please pick up your order from the counter</p>
        <p className="mt-2 text-sm text-stone-500">Show this screen or tell us your order number <span className="font-extrabold text-stone-900">#{order.number}</span></p>
      </div>
      <div className="p-4 pb-safe border-t border-stone-100">
        <button type="button" onClick={ack} disabled={busy} className="w-full h-16 rounded-2xl bg-stone-900 text-white font-extrabold text-lg hover:bg-stone-800 active:scale-[0.98] transition disabled:opacity-70">
          OK, I&apos;m coming 👍
        </button>
      </div>
    </Sheet>
  );
}
