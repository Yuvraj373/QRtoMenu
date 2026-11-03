import { useCart } from '../lib/cart';
import { formatPrice } from '../lib/menu';
import OfferProgress from './OfferProgress';
import { ArrowRightIcon, BagIcon } from './Icons';

// Floating bar at the bottom of the menu while the cart has items
export default function CartBar({ onOpen }) {
  const cart = useCart();
  if (!cart.count) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 pointer-events-none">
      <div className="max-w-xl mx-auto pointer-events-auto animate-sheet-up rounded-3xl bg-stone-900 text-white shadow-2xl shadow-stone-900/40 overflow-hidden">
        <div className="px-4 pt-3 pb-2.5 border-b border-white/10">
          <OfferProgress subtotal={cart.subtotal} dark />
        </div>
        <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition">
          <span className="relative grid place-items-center w-11 h-11 rounded-2xl bg-brand">
            <BagIcon className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-white text-stone-900 text-[11px] font-extrabold">{cart.count}</span>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs text-white/60 font-semibold">
              {cart.count} {cart.count === 1 ? 'item' : 'items'}
              {cart.giftUnlocked && ' + 1 free'}
            </span>
            <span className="block text-lg font-extrabold tabular-nums leading-tight">{formatPrice(cart.subtotal)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 h-11 px-4 rounded-2xl bg-white text-stone-900 text-sm font-extrabold">
            View cart <ArrowRightIcon className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  );
}
