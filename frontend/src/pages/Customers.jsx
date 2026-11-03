import { useEffect, useState } from 'react';
import AdminLayout from '../Components/AdminLayout';
import CustomerSheet from '../Components/CustomerSheet';
import SearchBar from '../Components/SearchBar';
import api, { errorMessage } from '../lib/api';
import { formatPrice } from '../lib/menu';
import { formatPhone } from '../lib/contact';
import { ArrowRightIcon, StarIcon } from '../Components/Icons';

const when = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Everyone who has ordered, one row per mobile number; tap a row for the full order history
export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get('/customers', { params: { q: search.trim() || undefined } })
        .then((res) => {
          setCustomers(res.data);
          setError('');
        })
        .catch((err) => setError(errorMessage(err)));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const repeat = customers?.filter((c) => c.orderCount > 1).length || 0;

  return (
    <AdminLayout title="Customers" subtitle="Every order is linked to the customer's mobile number — tap anyone to see all their past orders">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or mobile number" className="flex-1" />
        {customers && (
          <div className="flex gap-2 text-xs font-bold">
            <span className="inline-flex items-center h-12 px-4 rounded-xl bg-white border border-stone-200">{customers.length} customers</span>
            <span className="inline-flex items-center h-12 px-4 rounded-xl bg-violet-50 text-violet-700">🔁 {repeat} came back</span>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {!customers ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-18 rounded-2xl" />)}</div>
      ) : customers.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-stone-200 py-12 text-center text-sm font-semibold text-stone-400">
          {search ? 'No customer matches your search' : 'No customers yet — they appear here after their first order'}
        </p>
      ) : (
        <ul className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
          {customers.map((c) => (
            <li key={c._id}>
              <button type="button" onClick={() => setOpen(c._id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 transition">
                <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-brand/10 text-brand font-extrabold text-lg">{c.name[0]?.toUpperCase()}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-extrabold text-stone-900 truncate">{c.name}</span>
                    {c.orderCount > 1 && <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700">🔁 Regular</span>}
                  </span>
                  <span className="block text-xs font-semibold text-stone-500 tabular-nums">
                    {formatPhone(c.phone)} · last order {when(c.lastOrderAt)}
                  </span>
                </span>
                <span className="hidden sm:block text-right">
                  <span className="block font-extrabold tabular-nums">{formatPrice(c.totalSpent)}</span>
                  {c.avgRating && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600">
                      <StarIcon className="w-3 h-3" /> {c.avgRating}
                    </span>
                  )}
                </span>
                <span className="shrink-0 min-w-16 text-center rounded-xl bg-stone-100 px-2.5 py-1.5">
                  <span className="block text-base font-extrabold tabular-nums leading-none">{c.orderCount}</span>
                  <span className="text-[10px] font-bold text-stone-500">{c.orderCount === 1 ? 'order' : 'orders'}</span>
                </span>
                <ArrowRightIcon className="w-4 h-4 shrink-0 text-stone-300" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <CustomerSheet customerId={open} onClose={() => setOpen(null)} />
    </AdminLayout>
  );
}
