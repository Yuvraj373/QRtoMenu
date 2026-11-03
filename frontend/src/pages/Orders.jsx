import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Components/AdminLayout';
import ConfirmDialog from '../Components/ConfirmDialog';
import { useOrders } from '../lib/orders';
import { formatPrice } from '../lib/menu';
import { soundReady, unlockSound, playChime } from '../lib/sound';
import { BellIcon, BellOffIcon, CheckIcon, ClockIcon, GiftIcon, PhoneIcon, StarIcon } from '../Components/Icons';

const COLUMNS = [
  { id: 'new', title: 'New orders', emoji: '🔔', tone: 'bg-red-500', action: 'Accept & start cooking', next: 'preparing', btn: 'bg-red-600 hover:bg-red-700 shadow-red-600/30' },
  { id: 'preparing', title: 'Preparing', emoji: '👨‍🍳', tone: 'bg-amber-500', action: 'Mark as ready', next: 'ready', btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' },
  { id: 'ready', title: 'Ready to serve', emoji: '🛎️', tone: 'bg-green-500', action: 'Mark as served', next: 'served', btn: 'bg-green-600 hover:bg-green-700 shadow-green-600/30' },
];

// Re-render every 30s so "5 min ago" stays current
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const ago = (date, now) => {
  const min = Math.max(0, Math.floor((now - new Date(date)) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  return `${Math.floor(min / 60)}h ${min % 60}m ago`;
};

const clock = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3 sm:px-5 sm:py-4">
      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums text-stone-900">{value}</p>
      {sub && <p className="text-[11px] text-stone-400 font-semibold">{sub}</p>}
    </div>
  );
}

function OrderCard({ order, now, onStatus, onCancel }) {
  const col = COLUMNS.find((c) => c.id === order.status);
  const minutes = (now - new Date(order.createdAt)) / 60000;
  const late = col && minutes > 20;
  const isNew = order.status === 'new';

  return (
    <article className={`bg-white rounded-2xl border-2 overflow-hidden animate-fade-up ${isNew ? 'border-red-300 shadow-lg shadow-red-100 animate-glow' : 'border-stone-200'}`}>
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex flex-col items-center justify-center gap-1 w-14 h-14 shrink-0 rounded-2xl bg-stone-900 text-white">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/60 leading-none">Table</span>
          <span className="max-w-full truncate px-1 text-xl font-extrabold leading-none">{order.table}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-extrabold text-stone-900">#{order.number}</p>
            {isNew && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white animate-pulse">New</span>}
          </div>
          <p className="text-sm font-semibold text-stone-600 truncate">{order.customerName}</p>
          <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${late ? 'text-red-600' : 'text-stone-400'}`}>
            <ClockIcon className="w-3.5 h-3.5" /> {clock(order.createdAt)} · {ago(order.createdAt, now)}
          </p>
        </div>
        {order.phone && (
          <a href={`tel:${order.phone}`} aria-label={`Call ${order.customerName}`} className="grid place-items-center w-10 h-10 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200">
            <PhoneIcon className="w-4 h-4" />
          </a>
        )}
      </div>

      <ul className="mx-4 rounded-xl bg-stone-50 divide-y divide-stone-200/70">
        {order.items.map((l, i) => (
          <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="grid place-items-center min-w-7 h-7 rounded-lg bg-white ring-1 ring-stone-200 font-extrabold tabular-nums text-stone-900">{l.qty}</span>
            <span className="flex-1 min-w-0 font-semibold text-stone-800">
              {l.name}
              {l.size && <span className="ml-1.5 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-extrabold text-stone-700">{l.size === 'L' ? 'LARGE' : 'REG'}</span>}
            </span>
            {l.isFree && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold">
                <GiftIcon className="w-3 h-3" /> FREE
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.note && <p className="mx-4 mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-900">📝 {order.note}</p>}

      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <span className="text-lg font-extrabold tabular-nums">{formatPrice(order.total)}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
          <CheckIcon className="w-3 h-3" /> Paid · {order.payment?.method === 'card' ? 'Card' : 'UPI'}
        </span>
        {order.review?.rating && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            <StarIcon className="w-3 h-3" /> {order.review.rating}/5
          </span>
        )}
      </div>

      {col ? (
        <div className="flex gap-2 p-4">
          <button type="button" onClick={() => onStatus(order, col.next)} className={`flex-1 h-12 rounded-xl text-white font-extrabold text-sm shadow-lg transition active:scale-[0.98] ${col.btn}`}>
            {col.action}
          </button>
          {order.status !== 'ready' && (
            <button type="button" onClick={() => onCancel(order)} className="h-12 px-3.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-bold hover:bg-red-50 hover:text-red-600 transition">
              Cancel
            </button>
          )}
        </div>
      ) : (
        <p className={`m-4 mt-3 rounded-xl px-3 py-2 text-center text-xs font-extrabold uppercase tracking-wider ${order.status === 'served' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {order.status === 'served' ? `✓ Served · ${clock(order.updatedAt)}` : 'Cancelled'}
        </p>
      )}
    </article>
  );
}

function Empty({ text }) {
  return <p className="rounded-2xl border-2 border-dashed border-stone-200 py-10 text-center text-sm font-semibold text-stone-400">{text}</p>;
}

export default function Orders() {
  const { orders, loaded, connection, updateStatus } = useOrders();
  const now = useNow();
  const [tab, setTab] = useState('new');
  const [toCancel, setToCancel] = useState(null);
  const [sound, setSound] = useState(soundReady);

  // Browsers block audio until the page is clicked once
  useEffect(() => {
    const unlock = () => {
      unlockSound();
      setTimeout(() => setSound(soundReady()), 50);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const byStatus = useMemo(() => {
    const groups = { new: [], preparing: [], ready: [], done: [] };
    for (const o of orders) (groups[o.status] || groups.done).push(o);
    // Oldest first in the kitchen queue, newest first in history
    for (const k of ['new', 'preparing', 'ready']) groups[k].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return groups;
  }, [orders]);

  const today = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const list = orders.filter((o) => new Date(o.createdAt) >= start && o.status !== 'cancelled');
    const rated = list.filter((o) => o.review?.rating);
    return {
      count: list.length,
      revenue: list.reduce((s, o) => s + o.total, 0),
      gifts: list.filter((o) => o.freeGift).length,
      rating: rated.length ? (rated.reduce((s, o) => s + o.review.rating, 0) / rated.length).toFixed(1) : '—',
      rated: rated.length,
    };
  }, [orders, now]);

  const active = byStatus.new.length + byStatus.preparing.length + byStatus.ready.length;
  const cardProps = { now, onStatus: updateStatus, onCancel: setToCancel };

  return (
    <AdminLayout
      title="Live Orders"
      subtitle="New orders appear here instantly — no need to refresh"
      actions={
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-xs font-bold ${connection === 'live' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            <span className={`w-2 h-2 rounded-full ${connection === 'live' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            {connection === 'live' ? 'Live' : 'Connecting…'}
          </span>
          <button
            type="button"
            onClick={() => {
              unlockSound();
              playChime();
              setTimeout(() => setSound(soundReady()), 50);
            }}
            title="Test the new-order sound"
            className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-xs font-bold transition ${sound ? 'bg-stone-100 text-stone-700 hover:bg-stone-200' : 'bg-red-600 text-white animate-pulse'}`}
          >
            {sound ? <BellIcon className="w-4 h-4" /> : <BellOffIcon className="w-4 h-4" />}
            {sound ? 'Sound on' : 'Tap to enable sound'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Orders today" value={today.count} sub={`${active} in progress`} />
        <Stat label="Revenue today" value={formatPrice(today.revenue)} sub="Demo payments" />
        <Stat label="Free coffees" value={today.gifts} sub="Orders ₹600+" />
        <Stat label="Avg rating" value={today.rating === '—' ? '—' : `★ ${today.rating}`} sub={`${today.rated} ${today.rated === 1 ? 'review' : 'reviews'} today`} />
      </div>

      {!loaded ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Phones/tablets: one status at a time */}
          <div className="lg:hidden sticky top-16 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 bg-stone-50/95 backdrop-blur mb-3">
            <div className="grid grid-cols-4 gap-1 p-1 bg-stone-200/60 rounded-2xl">
              {[...COLUMNS, { id: 'done', title: 'Done', emoji: '✅' }].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTab(c.id)}
                  className={`relative h-12 rounded-xl text-[11px] sm:text-xs font-bold leading-tight transition ${tab === c.id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
                >
                  <span className="block text-base leading-none">{c.emoji}</span>
                  {c.id === 'done' ? 'Done' : c.title.split(' ')[0]}
                  {byStatus[c.id].length > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 grid place-items-center rounded-full text-[10px] font-extrabold text-white ${c.tone || 'bg-stone-500'}`}>
                      {byStatus[c.id].length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:hidden space-y-3">
            {byStatus[tab].length ? byStatus[tab].map((o) => <OrderCard key={o._id} order={o} {...cardProps} />) : <Empty text={tab === 'new' ? 'No new orders right now — they will pop up here 🔔' : 'Nothing here'} />}
          </div>

          {/* Desktop: kitchen board */}
          <div className="hidden lg:grid grid-cols-3 gap-5 items-start">
            {COLUMNS.map((c) => (
              <section key={c.id} className="min-w-0">
                <h2 className="flex items-center gap-2 mb-3 px-1 font-extrabold text-stone-800">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.tone}`} /> {c.emoji} {c.title}
                  <span className="ml-auto rounded-full bg-stone-200 px-2.5 py-0.5 text-xs tabular-nums">{byStatus[c.id].length}</span>
                </h2>
                <div className="space-y-3">
                  {byStatus[c.id].length ? byStatus[c.id].map((o) => <OrderCard key={o._id} order={o} {...cardProps} />) : <Empty text={c.id === 'new' ? 'Waiting for orders… 🔔' : 'Nothing here'} />}
                </div>
              </section>
            ))}
          </div>

          {byStatus.done.length > 0 && (
            <section className="hidden lg:block mt-10">
              <h2 className="mb-3 px-1 font-extrabold text-stone-800">✅ Completed today <span className="text-stone-400 font-semibold">· {byStatus.done.length}</span></h2>
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                {byStatus.done.map((o) => <OrderCard key={o._id} order={o} {...cardProps} />)}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toCancel}
        title={`Cancel order #${toCancel?.number}?`}
        message="The customer will see that their order was cancelled."
        confirmLabel="Cancel order"
        onConfirm={() => {
          updateStatus(toCancel, 'cancelled');
          setToCancel(null);
        }}
        onCancel={() => setToCancel(null)}
      />
    </AdminLayout>
  );
}
