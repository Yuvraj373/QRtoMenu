import { FREE_GIFT_MIN, FREE_GIFT_NAME } from '../lib/offer';
import { formatPrice } from '../lib/menu';

// "Add ₹150 more for a FREE Cold Coffee" with a progress bar
export default function OfferProgress({ subtotal, dark = false }) {
  const unlocked = subtotal >= FREE_GIFT_MIN;
  const pct = Math.min(100, (subtotal / FREE_GIFT_MIN) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className={`grid place-items-center w-9 h-9 shrink-0 rounded-full text-lg ${unlocked ? 'bg-amber-400 animate-wiggle' : dark ? 'bg-white/10' : 'bg-amber-100'}`}>☕</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold leading-tight ${dark ? 'text-white' : 'text-stone-800'}`}>
          {unlocked ? (
            <>🎉 FREE {FREE_GIFT_NAME} unlocked!</>
          ) : (
            <>
              Add <span className={dark ? 'text-amber-300' : 'text-amber-600'}>{formatPrice(FREE_GIFT_MIN - subtotal)}</span> more for a FREE {FREE_GIFT_NAME}
            </>
          )}
        </p>
        <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/15' : 'bg-amber-100'}`}>
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
