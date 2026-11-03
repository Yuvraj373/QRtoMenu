import { useState } from 'react';
import Sheet from './Sheet';
import Stepper from './Stepper';
import VegMark from './VegMark';
import OfferProgress from './OfferProgress';
import PaymentPanel from './PaymentPanel';
import { useCart } from '../lib/cart';
import { categoryIcon, formatPrice } from '../lib/menu';
import { FREE_GIFT_NAME } from '../lib/offer';
import { ArrowLeftIcon, CloseIcon, GiftIcon } from './Icons';

const CUSTOMER_KEY = 'customer';

const readCustomer = () => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || {};
  } catch {
    return {};
  }
};

const inputCls =
  'w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl outline-none transition focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/15 text-sm font-medium text-stone-900 placeholder:text-stone-400';

function Thumb({ src, category }) {
  return (
    <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-stone-100 grid place-items-center text-2xl">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : categoryIcon(category)}
    </div>
  );
}

export default function CheckoutSheet({ open, onClose, onPlaced, giftItem, defaultTable }) {
  const cart = useCart();
  const [step, setStep] = useState('cart');
  const [details, setDetails] = useState(() => ({ name: '', phone: '', note: '', ...readCustomer(), table: defaultTable || readCustomer().table || '' }));
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  const set = (key) => (e) => setDetails((d) => ({ ...d, [key]: e.target.value }));

  const close = () => {
    if (paying) return;
    setStep('cart');
    onClose();
  };

  const toPayment = (e) => {
    e.preventDefault();
    if (!details.name.trim()) return setError('Please enter your name');
    if (!details.table.trim()) return setError('Please enter your table number');
    setError('');
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: details.name, phone: details.phone, table: details.table }));
    } catch {
      // not critical
    }
    setStep('pay');
  };

  const placed = (order) => {
    cart.clear();
    setStep('cart');
    setDetails((d) => ({ ...d, note: '' }));
    onPlaced(order);
  };

  if (open && !cart.count && step === 'cart') {
    return (
      <Sheet open onClose={close}>
        <div className="p-8 pt-10 text-center">
          <div className="text-6xl">🛍️</div>
          <h2 className="mt-4 text-xl font-extrabold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-stone-500">Add something tasty from the menu.</p>
          <button type="button" onClick={close} className="mt-6 h-12 px-6 rounded-2xl bg-stone-900 text-white font-bold">Browse menu</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} dismissable={!paying} wide>
      <div className="shrink-0 flex items-center gap-3 px-5 pt-6 sm:pt-5 pb-4 border-b border-stone-100">
        {step === 'pay' && !paying && (
          <button type="button" onClick={() => setStep('cart')} aria-label="Back to cart" className="grid place-items-center w-10 h-10 -ml-1 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-extrabold text-stone-900">{step === 'cart' ? 'Your order' : 'Payment'}</h2>
          <p className="text-xs text-stone-500">{step === 'cart' ? `${cart.count} ${cart.count === 1 ? 'item' : 'items'} · Table ${details.table || '—'}` : `Order for ${details.name} · Table ${details.table}`}</p>
        </div>
        {!paying && (
          <button type="button" onClick={close} aria-label="Close" className="grid place-items-center w-10 h-10 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200">
            <CloseIcon />
          </button>
        )}
      </div>

      {step === 'cart' ? (
        <form onSubmit={toPayment} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <ul className="space-y-3">
              {cart.lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3">
                  <Thumb src={l.image} category={l.category} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <VegMark isVeg={l.isVeg} />
                      <p className="font-bold text-sm text-stone-900 truncate">{l.name}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {l.size && <span className="font-semibold text-stone-600">{l.size === 'L' ? 'Large' : 'Regular'} · </span>}
                      {formatPrice(l.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Stepper small qty={l.qty} onInc={() => cart.inc(l.key)} onDec={() => cart.dec(l.key)} />
                    <span className="text-xs font-bold tabular-nums text-stone-700">{formatPrice(l.price * l.qty)}</span>
                  </div>
                </li>
              ))}
              {cart.giftUnlocked && (
                <li className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-2.5 animate-pop">
                  <Thumb src={giftItem?.image} category={FREE_GIFT_NAME} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-stone-900">{FREE_GIFT_NAME}</p>
                    <p className="text-xs font-semibold text-amber-700">Gift on orders of ₹600+</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-stone-900">
                    <GiftIcon className="w-3.5 h-3.5" /> FREE
                  </span>
                </li>
              )}
            </ul>

            <div className="rounded-2xl bg-amber-50/60 border border-amber-100 p-3.5">
              <OfferProgress subtotal={cart.subtotal} />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Your details</p>
              <div className="grid grid-cols-[1fr_110px] gap-3">
                <input value={details.name} onChange={set('name')} placeholder="Your name *" autoComplete="given-name" maxLength={60} className={inputCls} />
                <input value={details.table} onChange={set('table')} placeholder="Table *" inputMode="numeric" maxLength={20} className={`${inputCls} text-center font-bold`} />
              </div>
              <input value={details.phone} onChange={set('phone')} placeholder="Mobile number (optional)" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} className={inputCls} />
              <textarea value={details.note} onChange={set('note')} placeholder="Cooking note — e.g. less spicy, extra cheese (optional)" rows={2} maxLength={300} className={`${inputCls} h-auto py-3 resize-none`} />
            </div>

            <div className="rounded-2xl border border-stone-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Item total</span>
                <span className="font-semibold tabular-nums">{formatPrice(cart.subtotal)}</span>
              </div>
              {cart.giftUnlocked && (
                <div className="flex justify-between text-amber-700">
                  <span>Free {FREE_GIFT_NAME}</span>
                  <span className="font-semibold">
                    {giftItem && <span className="line-through text-stone-400 mr-1.5">{formatPrice(giftItem.priceM)}</span>}₹0
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-dashed border-stone-200 text-base font-extrabold text-stone-900">
                <span>To pay</span>
                <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
              </div>
            </div>

            {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
          </div>

          <div className="shrink-0 p-4 pb-safe border-t border-stone-100 bg-white">
            <button type="submit" className="w-full h-14 rounded-2xl bg-brand text-white font-extrabold text-base shadow-lg shadow-brand/30 hover:brightness-110 active:scale-[0.98] transition">
              Proceed to pay {formatPrice(cart.subtotal)}
            </button>
          </div>
        </form>
      ) : (
        <PaymentPanel amount={cart.subtotal} details={details} lines={cart.lines} onBusy={setPaying} onDone={placed} />
      )}
    </Sheet>
  );
}
