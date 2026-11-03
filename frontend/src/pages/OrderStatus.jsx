import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { subscribe } from '../lib/stream';
import { useSettings } from '../lib/SettingsContext';
import { categoryIcon, formatPrice } from '../lib/menu';
import ReviewGate, { Stars } from '../Components/ReviewGate';
import { ArrowLeftIcon, CheckIcon, GiftIcon } from '../Components/Icons';

const STEPS = [
  { id: 'new', label: 'Order placed', short: 'Placed', hint: 'Waiting for the kitchen to accept', emoji: '🧾' },
  { id: 'preparing', label: 'Preparing', hint: 'Our chef is cooking your food', emoji: '👨‍🍳' },
  { id: 'ready', label: 'Ready', hint: 'Your food is on its way to your table', emoji: '🛎️' },
  { id: 'served', label: 'Served', hint: 'Enjoy your meal!', emoji: '😋' },
];

const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function OrderStatus() {
  const { trackingId } = useParams();
  const { settings } = useSettings();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(
    () =>
      subscribe(`/orders/track/${encodeURIComponent(trackingId)}/stream`, {
        onEvent: (event, data) => {
          if (event !== 'order') return;
          setOrder(data);
          setState('live');
        },
        onStatus: (status, code) => {
          if (code === 404) setState('missing');
          else if (status === 'reconnecting') setState((s) => (s === 'loading' ? s : 'reconnecting'));
        },
      }),
    [trackingId]
  );

  if (state === 'missing') {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div>
          <div className="text-6xl">🤔</div>
          <h1 className="mt-4 text-xl font-extrabold">Order not found</h1>
          <Link to="/" className="mt-6 inline-flex h-12 px-6 items-center rounded-2xl bg-stone-900 text-white font-bold">Back to menu</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <span className="w-9 h-9 rounded-full border-[3px] border-stone-200 border-t-brand animate-spin" />
      </div>
    );
  }

  const cancelled = order.status === 'cancelled';
  const current = STEPS.findIndex((s) => s.id === order.status);
  const step = STEPS[current];

  return (
    <div className="min-h-dvh bg-stone-50 pb-10">
      <header className="relative overflow-hidden bg-stone-900 text-white">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand/50 blur-3xl" />
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 pt-5 pb-16">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full bg-white/10 text-sm font-bold hover:bg-white/15">
              <ArrowLeftIcon className="w-4 h-4" /> Menu
            </Link>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${state === 'live' ? 'bg-green-500/15 text-green-300' : 'bg-amber-500/15 text-amber-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${state === 'live' ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
              {state === 'live' ? 'Live updates' : 'Reconnecting…'}
            </span>
          </div>
          <p className="mt-6 text-sm font-semibold text-white/60">{settings.restaurantName} · Table {order.table}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">Order #{order.number}</h1>
          <p className="mt-1 text-sm text-white/60">Placed at {time(order.createdAt)} by {order.customerName}</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 -mt-10 relative space-y-4">
        {/* Status */}
        <section className="bg-white rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-100 p-5 sm:p-6">
          {cancelled ? (
            <div className="text-center py-4">
              <div className="text-5xl">😔</div>
              <h2 className="mt-3 text-xl font-extrabold text-red-600">Order cancelled</h2>
              <p className="mt-1 text-sm text-stone-500">Please talk to our staff — your payment will be refunded.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span key={step.id} className="grid place-items-center w-16 h-16 rounded-2xl bg-brand/10 text-4xl animate-pop">{step.emoji}</span>
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold text-stone-900">{step.label}</h2>
                  <p className="text-sm text-stone-500">{step.hint}</p>
                </div>
              </div>
              <ol className="mt-6 grid grid-cols-4 gap-1.5">
                {STEPS.map((s, i) => (
                  <li key={s.id}>
                    <div className={`h-2 rounded-full transition-colors duration-500 ${i <= current ? 'bg-brand' : 'bg-stone-200'} ${i === current && i < 3 ? 'animate-pulse' : ''}`} />
                    <p className={`mt-2 text-[11px] sm:text-xs font-bold ${i <= current ? 'text-stone-900' : 'text-stone-400'}`}>
                      {i < current && <CheckIcon className="inline w-3 h-3 mr-0.5 -mt-0.5 text-brand" />}
                      {s.short || s.label}
                    </p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        {/* Items */}
        <section className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Your items</h3>
          <ul className="mt-3 divide-y divide-stone-100">
            {order.items.map((l, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-stone-100 grid place-items-center text-xl">
                  {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : categoryIcon(l.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-stone-900 truncate">
                    <span className="text-brand">{l.qty}×</span> {l.name}
                  </p>
                  {l.size && <p className="text-xs text-stone-500">{l.size === 'L' ? 'Large' : 'Regular'}</p>}
                </div>
                {l.isFree ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold">
                    <GiftIcon className="w-3.5 h-3.5" /> FREE
                  </span>
                ) : (
                  <span className="text-sm font-bold tabular-nums">{formatPrice(l.price * l.qty)}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-2 pt-3 border-t border-dashed border-stone-200 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
              <CheckIcon className="w-3.5 h-3.5" /> Paid · {order.payment.method === 'upi' ? 'UPI' : 'Card'}
            </span>
            <span className="text-lg font-extrabold tabular-nums">{formatPrice(order.total)}</span>
          </div>
          <p className="mt-2 text-[11px] text-stone-400">Transaction ID: {order.payment.ref}</p>
        </section>

        {order.review && (
          <section className="bg-white rounded-3xl border border-stone-200 p-5 text-center">
            <Stars value={order.review.rating} size="w-7 h-7" />
            <p className="mt-2 text-sm font-bold text-stone-900">Thank you for your review! 💛</p>
          </section>
        )}

        <Link to="/" className="flex items-center justify-center h-14 rounded-2xl bg-stone-900 text-white font-extrabold hover:bg-stone-800 transition">
          Order something more
        </Link>
      </main>

      {!order.review && <ReviewGate order={order} reviewUrl={settings.googleReviewUrl || 'https://share.google/oZNCrAVVJFrvIMey7'} onDone={setOrder} />}
    </div>
  );
}
