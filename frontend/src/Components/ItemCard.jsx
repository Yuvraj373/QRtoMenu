import { useState } from 'react';
import VegMark from './VegMark';
import Stepper from './Stepper';
import { PlusIcon, StarIcon } from './Icons';
import { categoryIcon, formatPrice } from '../lib/menu';

function Price({ label, value, strong }) {
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-lg px-2 py-1 ${strong ? 'bg-brand/10 text-brand' : 'bg-stone-100 text-stone-800'}`}>
      <span className="text-[10px] font-bold uppercase opacity-70">{label}</span>
      <span className="text-sm font-extrabold tabular-nums">{formatPrice(value)}</span>
    </span>
  );
}

// Swiggy-style ADD button that sits on the photo; turns into a stepper once added
function AddControl({ hasSizes, qty, onAdd, onInc, onDec }) {
  if (qty && !hasSizes) return <Stepper qty={qty} onInc={onInc} onDec={onDec} />;
  return (
    <button
      type="button"
      onClick={onAdd}
      className={`inline-flex items-center justify-center gap-1 h-9 min-w-[92px] px-4 rounded-full text-[13px] font-extrabold shadow-lg transition active:scale-95 ${
        qty ? 'bg-brand text-white shadow-brand/30' : 'bg-white text-brand ring-1 ring-stone-200 shadow-stone-300/50 hover:bg-brand hover:text-white'
      }`}
    >
      {qty ? `${qty} added` : 'ADD'} <PlusIcon className="w-3.5 h-3.5" />
    </button>
  );
}

export default function ItemCard({ item, qty = 0, onAdd, onInc, onDec }) {
  const [imgFailed, setImgFailed] = useState(false);
  const unavailable = item.isAvailable === false;
  const hasLarge = item.priceL != null && item.priceL !== '';

  return (
    <article
      className={`group relative flex gap-3 sm:gap-4 rounded-3xl bg-white p-3.5 sm:p-4 pb-5 sm:pb-6 border border-stone-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-lg hover:shadow-stone-200/60 hover:-translate-y-0.5 h-full ${unavailable ? 'opacity-60' : ''}`}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <VegMark isVeg={item.isVeg} />
          {item.isSpecial && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <StarIcon /> Special
            </span>
          )}
        </div>
        <h3 className="font-bold text-stone-900 text-[15px] sm:text-base leading-snug line-clamp-2">{item.name}</h3>
        {item.description && (
          <p className="mt-1 text-[13px] text-stone-500 leading-relaxed line-clamp-2">{item.description}</p>
        )}
        <div className="mt-auto pt-3 flex flex-wrap items-center gap-1.5">
          <Price label={hasLarge ? 'M' : ''} value={item.priceM} />
          {hasLarge && <Price label="L" value={item.priceL} strong />}
        </div>
      </div>

      <div className="relative w-28 sm:w-32 shrink-0 self-start pb-4">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-stone-100 shadow-sm">
          {item.image && !imgFailed ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-4xl bg-gradient-to-br from-stone-100 to-stone-200">
              {categoryIcon(item.category)}
            </div>
          )}
        </div>
        <div className="absolute -bottom-0.5 inset-x-0 flex justify-center">
          {unavailable ? (
            <span className="h-9 px-4 grid place-items-center rounded-full bg-stone-800 text-white text-[11px] font-extrabold uppercase tracking-wide shadow-lg">Sold out</span>
          ) : (
            onAdd && <AddControl hasSizes={hasLarge} qty={qty} onAdd={onAdd} onInc={onInc} onDec={onDec} />
          )}
        </div>
        {hasLarge && !unavailable && onAdd && <p className="absolute -bottom-5 inset-x-0 text-center text-[10px] font-semibold text-stone-400">2 sizes</p>}
      </div>
    </article>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-3xl bg-white p-4 border border-stone-200/70">
      <div className="flex-1 space-y-2.5">
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-7 w-28 rounded-lg mt-4" />
      </div>
      <div className="skeleton w-28 h-28 sm:w-32 sm:h-32 rounded-2xl" />
    </div>
  );
}
