import { useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { formatPrice } from '../lib/menu';
import { CardIcon, CheckIcon, LockIcon, MobileIcon } from './Icons';

const inputCls =
  'w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl outline-none transition focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/15 text-[15px] font-semibold tracking-wide text-stone-900 placeholder:text-stone-400 placeholder:font-medium placeholder:tracking-normal';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const formatCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v) => v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');

// Demo checkout: looks and feels like a real payment, but no money moves.
// Any UPI id / 10-digit number or any 12–19 digit card number is accepted.
export default function PaymentPanel({ amount, details, lines, onBusy, onDone }) {
  const [method, setMethod] = useState('upi');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [phase, setPhase] = useState('form');
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const validate = () => {
    if (method === 'upi') {
      const digits = upi.replace(/\D/g, '');
      return /^[\w.-]{2,}@[a-z]{2,}$/i.test(upi.trim()) || digits.length === 10 ? '' : 'Enter a UPI ID (name@bank) or a 10-digit mobile number';
    }
    const digits = card.number.replace(/\D/g, '');
    if (digits.length < 12) return 'Enter a card number (12–19 digits)';
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return 'Enter expiry as MM/YY';
    if (!/^\d{3,4}$/.test(card.cvv)) return 'Enter the 3-digit CVV';
    return '';
  };

  const pay = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setError('');
    setPhase('processing');
    onBusy(true);
    try {
      const [res] = await Promise.all([
        api.post('/orders', {
          customerName: details.name,
          table: details.table,
          phone: details.phone,
          note: details.note,
          items: lines.map((l) => ({ id: l.id, size: l.size, qty: l.qty })),
          payment: { method, value: method === 'upi' ? upi : card.number },
        }),
        wait(1800),
      ]);
      setOrder(res.data);
      setPhase('success');
    } catch (err) {
      setError(errorMessage(err));
      setPhase('form');
      onBusy(false);
    }
  };

  if (phase === 'processing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="relative w-20 h-20">
          <span className="absolute inset-0 rounded-full border-4 border-stone-100" />
          <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand animate-spin" />
          <span className="absolute inset-0 grid place-items-center text-stone-700">
            <LockIcon className="w-7 h-7" />
          </span>
        </div>
        <p className="mt-6 text-lg font-extrabold">Processing payment…</p>
        <p className="mt-1 text-sm text-stone-500">Please don&apos;t close this page</p>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex flex-col items-center text-center px-6 pt-10 pb-6">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-green-400/40 animate-ping-once" />
            <span className="relative grid place-items-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-xl shadow-green-500/40 animate-pop">
              <CheckIcon className="w-12 h-12 animate-draw" />
            </span>
          </div>
          <h3 className="mt-6 text-2xl font-extrabold text-stone-900">Payment successful!</h3>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-green-600">{formatPrice(order.total)}</p>
          <p className="mt-3 text-sm text-stone-500">
            Order <span className="font-extrabold text-stone-900">#{order.number}</span> has been sent to the kitchen 👨‍🍳
          </p>
        </div>
        <dl className="mx-5 rounded-2xl bg-stone-50 border border-stone-200 divide-y divide-stone-200 text-sm">
          {[
            ['Paid via', `${order.payment.method === 'upi' ? 'UPI' : 'Card'} · ${order.payment.masked}`],
            ['Transaction ID', order.payment.ref],
            ['Table', order.table],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-stone-500">{k}</dt>
              <dd className="font-bold text-stone-900 text-right break-all">{v}</dd>
            </div>
          ))}
        </dl>
        {order.freeGift && (
          <p className="mx-5 mt-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-bold text-amber-800">🎁 A FREE Cold Coffee is included with your order!</p>
        )}
        <div className="mt-auto p-4 pb-safe">
          <button type="button" onClick={() => { onBusy(false); onDone(order); }} className="mt-4 w-full h-14 rounded-2xl bg-stone-900 text-white font-extrabold text-base hover:bg-stone-800 transition">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={pay} className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="rounded-3xl bg-gradient-to-br from-stone-900 to-stone-700 text-white p-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-10 w-36 h-36 rounded-full bg-brand/40 blur-2xl" />
          <p className="relative text-xs font-semibold text-white/60">Amount to pay</p>
          <p className="relative mt-0.5 text-4xl font-extrabold tabular-nums">{formatPrice(amount)}</p>
          <p className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
            <LockIcon className="w-3 h-3" /> Demo mode · no real money is charged
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
          {[
            ['upi', 'UPI', MobileIcon],
            ['card', 'Card', CardIcon],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setMethod(id); setError(''); }}
              className={`flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition ${method === id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {method === 'upi' ? (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-600" htmlFor="upi">UPI ID or mobile number</label>
            <input id="upi" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@upi or 98765 43210" autoComplete="off" className={inputCls} />
            <p className="text-[11px] text-stone-400">Demo: type any 10-digit number or anything like name@bank</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-600" htmlFor="card">Card number</label>
              <input id="card" value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: formatCard(e.target.value) }))} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="off" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))} placeholder="MM/YY" inputMode="numeric" autoComplete="off" aria-label="Expiry" className={inputCls} />
              <input value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="CVV" inputMode="numeric" type="password" autoComplete="off" aria-label="CVV" className={inputCls} />
            </div>
            <p className="text-[11px] text-stone-400">Demo: any random numbers work — nothing is stored except the last 4 digits</p>
          </div>
        )}

        {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      </div>

      <div className="shrink-0 p-4 pb-safe border-t border-stone-100 bg-white">
        <button type="submit" className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 text-white font-extrabold text-base shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-[0.98] transition">
          <LockIcon className="w-4 h-4" /> Pay {formatPrice(amount)}
        </button>
      </div>
    </form>
  );
}
