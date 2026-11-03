import { useEffect, useState } from 'react';
import Sheet from './Sheet';
import api, { errorMessage } from '../lib/api';
import { formatPrice } from '../lib/menu';
import { callLink, formatPhone, whatsappLink } from '../lib/contact';
import { CloseIcon, PhoneIcon, StarIcon } from './Icons';

const STATUS = {
  new: ['New', 'bg-red-100 text-red-700'],
  preparing: ['Preparing', 'bg-amber-100 text-amber-800'],
  ready: ['Waiting for pickup', 'bg-green-100 text-green-800'],
  served: ['Picked up', 'bg-stone-100 text-stone-600'],
  cancelled: ['Cancelled', 'bg-red-50 text-red-500 line-through'],
};

const dateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Everything one customer (one mobile number) has ever ordered
export default function CustomerSheet({ customerId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    api
      .get(`/customers/${customerId}`)
      .then((res) => !cancelled && setData(res.data))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
      setData(null);
      setError('');
    };
  }, [customerId]);

  const c = data?.customer;
  const orders = data?.orders || [];
  const rated = orders.filter((o) => o.review?.rating);
  const avg = rated.length ? (rated.reduce((s, o) => s + o.review.rating, 0) / rated.length).toFixed(1) : null;
  // Most-ordered dishes, ignoring free gifts
  const favourites = Object.entries(
    orders.filter((o) => o.status !== 'cancelled').flatMap((o) => o.items.filter((l) => !l.isFree)).reduce((m, l) => ({ ...m, [l.name]: (m[l.name] || 0) + l.qty }), {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Sheet open={!!customerId} onClose={onClose} wide>
      <div className="shrink-0 flex items-start gap-3 px-5 pt-6 sm:pt-5 pb-4 border-b border-stone-100">
        <span className="grid place-items-center w-12 h-12 shrink-0 rounded-2xl bg-brand text-white text-xl font-extrabold">{c?.name?.[0]?.toUpperCase() || '·'}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-extrabold text-stone-900 truncate">{c?.name || 'Customer'}</h2>
          {c && <p className="text-sm font-semibold text-stone-500 tabular-nums">{formatPhone(c.phone)}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid place-items-center w-10 h-10 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200">
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        {!data && !error && [0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}

        {c && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Orders', c.orderCount],
                ['Spent', formatPrice(c.totalSpent)],
                ['Rating', avg ? `★ ${avg}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-stone-50 border border-stone-200 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{k}</p>
                  <p className="mt-0.5 text-lg font-extrabold tabular-nums text-stone-900">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-500">
              Customer since <span className="font-bold text-stone-700">{dateTime(c.firstOrderAt)}</span>
              {favourites.length > 0 && (
                <>
                  {' · '}Favourites: <span className="font-bold text-stone-700">{favourites.map(([n, q]) => `${n} ×${q}`).join(', ')}</span>
                </>
              )}
            </p>
            <div className="flex gap-2">
              <a href={callLink(c.phone)} className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-100 text-sm font-bold text-stone-700 hover:bg-stone-200">
                <PhoneIcon className="w-4 h-4" /> Call
              </a>
              <a href={whatsappLink(c.phone, `Hi ${c.name.split(' ')[0]}, `)} target="_blank" rel="noreferrer" className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-bold text-white hover:bg-green-700">
                WhatsApp
              </a>
            </div>

            <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-stone-400">All orders · {orders.length}</h3>
            <ul className="space-y-2.5">
              {orders.map((o) => {
                const [label, cls] = STATUS[o.status] || STATUS.served;
                return (
                  <li key={o._id} className="rounded-2xl border border-stone-200 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-stone-900">#{o.number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${cls}`}>{label}</span>
                      <span className="ml-auto font-extrabold tabular-nums">{formatPrice(o.total)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-stone-400">{dateTime(o.createdAt)}</p>
                    <p className="mt-1.5 text-sm text-stone-700">
                      {o.items.map((l) => `${l.qty}× ${l.name}${l.size === 'L' ? ' (L)' : ''}${l.isFree ? ' 🎁' : ''}`).join(', ')}
                    </p>
                    {o.review?.rating && (
                      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <span className="inline-flex items-center gap-0.5 font-extrabold">
                          <StarIcon className="w-3 h-3" /> {o.review.rating}/5
                        </span>
                        {o.review.tags?.length > 0 && <span className="font-semibold"> · {o.review.tags.join(', ')}</span>}
                        {o.review.comment && <span className="block mt-1 italic">“{o.review.comment}”</span>}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Sheet>
  );
}
