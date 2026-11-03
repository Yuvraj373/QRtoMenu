import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { subscribe } from '../lib/stream';
import { useSettings } from '../lib/SettingsContext';
import { categoryIcon, formatPrice } from '../lib/menu';
import { playChime, soundReady, unlockSound } from '../lib/sound';
import { askPermission, isIOS, isStandalone, onPushMessage, permission, sendTestAlert, subscribeToOrder } from '../lib/push';
import { useWakeLock } from '../lib/wakeLock';
import ReviewGate, { Stars } from '../Components/ReviewGate';
import PickupAlert from '../Components/PickupAlert';
import { ArrowLeftIcon, BellIcon, CheckIcon, ClockIcon, GiftIcon } from '../Components/Icons';

const STEPS = [
  { id: 'new', label: 'Order placed', short: 'Placed', hint: 'Waiting for the kitchen to accept', emoji: '🧾' },
  { id: 'preparing', label: 'Preparing', hint: 'Our chef is cooking your food', emoji: '👨‍🍳' },
  { id: 'ready', label: 'Ready for pickup', short: 'Ready', hint: 'Please collect it from the counter', emoji: '🛎️' },
  { id: 'served', label: 'Picked up', hint: 'Enjoy your meal!', emoji: '😋' },
];

const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) || n % 10 > 3 ? 0 : n % 10]}`;

function useNow(ms) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// "Ready in 12 min" countdown from the time the kitchen promised
function Eta({ order, now }) {
  if (order.status === 'new') {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-stone-50 border border-stone-200 p-4">
        <ClockIcon className="w-6 h-6 shrink-0 text-stone-400" />
        <p className="text-sm font-semibold text-stone-600">The kitchen will accept your order and tell you how long it will take.</p>
      </div>
    );
  }
  if (order.status !== 'preparing' || !order.etaAt) return null;
  const eta = new Date(order.etaAt).getTime();
  const total = (order.prepMinutes || 15) * 60000;
  const left = Math.round((eta - now) / 60000);
  const progress = Math.min(1, Math.max(0.03, 1 - (eta - now) / total));
  return (
    <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand to-orange-500 text-white p-5 shadow-lg shadow-brand/25">
      <p className="text-xs font-bold uppercase tracking-wider text-white/75">{left > 0 ? 'Ready in about' : 'Almost there'}</p>
      <p className="mt-1 text-4xl font-extrabold tabular-nums leading-none">{left > 0 ? `${left} min` : 'Any moment now ⏳'}</p>
      <div className="mt-4 h-2.5 rounded-full bg-white/25 overflow-hidden">
        <div className="h-full rounded-full bg-white transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-white/85">Expected by {time(eta)} · we&apos;ll ring your phone when it&apos;s ready</p>
    </div>
  );
}

function AlertBanner({ state, sound, onTurnOn, onTest, testing }) {
  const ok = state === 'on';
  const actionable = state === 'off' || (!ok && !sound);
  const text = {
    on: "Alerts on — we'll ring your phone when your order is ready, even if you close this page.",
    off: 'Tap here to get an alert on your phone when your order is ready.',
    denied: 'Notifications are blocked for this site, so keep this page open — it will ring here when your order is ready.',
    'ios-install': 'iPhone: keep this page open to hear the alert. To get it even after closing, tap Share → "Add to Home Screen", open the app from there and allow notifications.',
    unsupported: 'Keep this page open — your phone will ring here when your order is ready.',
  }[state];
  if (ok) {
    return (
      <div className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-sm font-bold shadow-lg bg-green-50 text-green-800 ring-1 ring-green-200">
        <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-green-100">
          <BellIcon className="w-5 h-5" />
        </span>
        <span className="flex-1">{text}</span>
        <button type="button" onClick={onTest} disabled={testing} className="shrink-0 h-9 px-3 rounded-xl bg-white ring-1 ring-green-300 text-xs font-extrabold hover:bg-green-100 disabled:opacity-60">
          {testing ? 'Sent ✓' : 'Test 🔔'}
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onTurnOn}
      className={`w-full flex items-center gap-3 rounded-2xl p-3.5 text-left text-sm font-bold shadow-lg transition ${
        actionable ? 'bg-amber-400 text-stone-900 animate-pulse' : 'bg-white text-stone-700 ring-1 ring-stone-200'
      }`}
    >
      <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-white/60">
        <BellIcon className="w-5 h-5" />
      </span>
      <span>
        {text}
        {!sound && state !== 'off' && <span className="block mt-0.5 text-xs font-semibold opacity-80">Tap once to turn on the sound.</span>}
      </span>
    </button>
  );
}

export default function OrderStatus() {
  const { trackingId } = useParams();
  const { settings } = useSettings();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading');
  const [sound, setSound] = useState(soundReady);
  // on | off | denied | ios-install | unsupported
  const [alerts, setAlerts] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const now = useNow(10000);
  const last = useRef(null);

  const alertState = (p) => (p === 'denied' ? 'denied' : p === 'unsupported' ? (isIOS() && !isStandalone() ? 'ios-install' : 'unsupported') : 'off');

  // Already allowed notifications (e.g. on the payment screen): subscribe this phone to the order
  useEffect(() => {
    let cancelled = false;
    const p = permission();
    (p === 'granted' ? subscribeToOrder(trackingId).then((ok) => (ok ? 'on' : 'off')) : Promise.resolve(alertState(p))).then((s) => !cancelled && setAlerts(s));
    return () => {
      cancelled = true;
    };
  }, [trackingId]);

  const turnOnAlerts = async () => {
    unlockSound();
    setSound(soundReady());
    const p = await askPermission();
    setAlerts(p === 'granted' ? ((await subscribeToOrder(trackingId)) ? 'on' : 'off') : alertState(p));
  };

  const testAlert = async () => {
    setTesting(true);
    setTestError('');
    try {
      await sendTestAlert(trackingId);
    } catch (err) {
      setTestError(errorMessage(err));
      if (err.response?.status === 409) setAlerts('off');
    }
    setTimeout(() => setTesting(false), 4000);
  };

  // Fresh copy from the server: used when a push arrives or the customer comes back to
  // the tab, in case the live stream was paused while the phone was asleep
  useEffect(() => {
    const refresh = () =>
      api
        .get(`/orders/track/${encodeURIComponent(trackingId)}`)
        .then((res) => setOrder(res.data))
        .catch(() => {});
    const offPush = onPushMessage((data) => data.trackingId === trackingId && refresh());
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      offPush();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [trackingId]);

  // Browsers only play sound after a tap on the page; any tap arms the pickup alert
  useEffect(() => {
    const unlock = () => {
      unlockSound();
      setTimeout(() => setSound(soundReady()), 50);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(
    () =>
      subscribe(`/orders/track/${encodeURIComponent(trackingId)}/stream`, {
        onEvent: (event, data) => {
          if (event !== 'order') return;
          // Small "ding" when the kitchen accepts or changes the time while the page is open
          const prev = last.current;
          if (prev && data.status === 'preparing' && (prev.status !== data.status || prev.etaAt !== data.etaAt)) {
            playChime();
            navigator.vibrate?.([200, 100, 200]);
          }
          last.current = data;
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

  const active = !!order && ['new', 'preparing', 'ready'].includes(order.status);
  // No push alerts on this phone: keep the screen awake so the page itself can ring
  useWakeLock(active && alerts !== null && alerts !== 'on');

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
  const ringing = order.status === 'ready' && order.readyAt && (!order.pickupAck || new Date(order.pickupAck) < new Date(order.readyAt));
  const waiting = ['new', 'preparing'].includes(order.status);

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
          <p className="mt-6 text-sm font-semibold text-white/60">{settings.restaurantName} · Pick up at the counter</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">Order #{order.number}</h1>
          <p className="mt-1 text-sm text-white/60">Placed at {time(order.createdAt)} by {order.customerName}</p>
          {order.visit > 1 && (
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-amber-300">Your {ordinal(order.visit)} order with us — thanks for coming back! 💛</p>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 -mt-10 relative space-y-4">
        {waiting && alerts && <AlertBanner state={alerts} sound={sound} onTurnOn={turnOnAlerts} onTest={testAlert} testing={testing} />}
        {waiting && testError && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">{testError}</p>}
        {waiting && alerts && alerts !== 'on' && (
          <p className="px-2 text-center text-xs font-semibold text-stone-500">Your screen will stay on while you wait, so you can hear the ring.</p>
        )}

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
              <Eta order={order} now={now} />
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
            {order.review.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {order.review.tags.map((t) => <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-600">{t}</span>)}
              </div>
            )}
            {order.review.comment && <p className="mt-3 text-sm text-stone-600 italic">“{order.review.comment}”</p>}
            <p className="mt-3 text-sm font-bold text-stone-900">Thank you for your review! 💛</p>
          </section>
        )}

        <Link to="/" className="flex items-center justify-center h-14 rounded-2xl bg-stone-900 text-white font-extrabold hover:bg-stone-800 transition">
          Order something more
        </Link>
      </main>

      {ringing && <PickupAlert order={order} onAck={setOrder} />}
      {!order.review && !ringing && <ReviewGate order={order} onDone={setOrder} />}
    </div>
  );
}
