import Sheet from './Sheet';
import Stepper from './Stepper';
import VegMark from './VegMark';
import { useCart } from '../lib/cart';
import { categoryIcon, formatPrice } from '../lib/menu';
import { PlusIcon } from './Icons';

// Pick Regular / Large for items that come in two sizes
export default function SizeSheet({ item, onClose }) {
  const cart = useCart();
  if (!item) return null;

  const sizes = [
    { size: 'M', label: 'Regular', hint: 'Medium size', price: item.priceM },
    { size: 'L', label: 'Large', hint: 'Best for sharing', price: item.priceL },
  ];
  const total = sizes.reduce((sum, s) => sum + s.price * cart.qtyOf(item._id, s.size), 0);

  return (
    <Sheet open onClose={onClose}>
      <div className="relative h-44 sm:h-52 shrink-0 bg-stone-100">
        {item.image ? (
          <img src={item.image.replace(/w=\d+/, 'w=800').replace(/h=\d+/, 'h=500')} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-6xl">{categoryIcon(item.category)}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-5 text-white">
          <div className="flex items-center gap-2">
            <span className="bg-white rounded p-0.5"><VegMark isVeg={item.isVeg} /></span>
            <span className="text-xs font-semibold text-white/80">{item.category}</span>
          </div>
          <h3 className="mt-1 text-xl font-extrabold leading-tight">{item.name}</h3>
        </div>
      </div>

      <div className="p-5 space-y-3 overflow-y-auto">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Choose a size</p>
        {sizes.map((s) => {
          const qty = cart.qtyOf(item._id, s.size);
          const key = cart.keyOf(item._id, s.size);
          return (
            <div key={s.size} className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 transition ${qty ? 'border-brand bg-brand/5' : 'border-stone-200'}`}>
              <span className={`grid place-items-center w-11 h-11 rounded-xl font-extrabold ${qty ? 'bg-brand text-white' : 'bg-stone-100 text-stone-600'}`}>{s.size}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900">{s.label}</p>
                <p className="text-xs text-stone-500">{s.hint}</p>
              </div>
              <span className="font-extrabold tabular-nums text-stone-900 mr-1">{formatPrice(s.price)}</span>
              {qty ? (
                <Stepper small qty={qty} onInc={() => cart.inc(key)} onDec={() => cart.dec(key)} />
              ) : (
                <button type="button" onClick={() => cart.add(item, s.size)} className="inline-flex items-center gap-1 h-8 px-3.5 rounded-full border-2 border-brand text-brand text-xs font-extrabold hover:bg-brand hover:text-white transition">
                  ADD <PlusIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 pb-safe border-t border-stone-100">
        <button type="button" onClick={onClose} className="w-full h-13 rounded-2xl bg-stone-900 text-white font-bold text-[15px] hover:bg-stone-800 transition">
          {total ? `Done · ${formatPrice(total)}` : 'Close'}
        </button>
      </div>
    </Sheet>
  );
}
