import { useState } from 'react';
import VegMark from './VegMark';
import { StarIcon } from './Icons';
import { categoryIcon, formatPrice } from '../lib/menu';

function Price({ label, value, strong }) {
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-lg px-2 py-1 ${strong ? 'bg-brand/10 text-brand' : 'bg-stone-100 text-stone-800'}`}>
      <span className="text-[10px] font-bold uppercase opacity-70">{label}</span>
      <span className="text-sm font-extrabold tabular-nums">{formatPrice(value)}</span>
    </span>
  );
}

export default function ItemCard({ item }) {
  const [imgFailed, setImgFailed] = useState(false);
  const unavailable = item.isAvailable === false;
  const hasLarge = item.priceL != null && item.priceL !== '';

  return (
    <article
      className={`group relative flex gap-3 sm:gap-4 rounded-2xl bg-white p-3 sm:p-4 border border-stone-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-lg hover:shadow-stone-200/60 hover:-translate-y-0.5 h-full ${unavailable ? 'opacity-60' : ''}`}
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

      <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 self-start">
        <div className="w-full h-full rounded-xl overflow-hidden bg-stone-100">
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
        {unavailable && (
          <span className="absolute inset-x-1 bottom-1 rounded-md bg-stone-900/85 text-white text-[10px] font-bold text-center py-1 uppercase tracking-wide">
            Sold out
          </span>
        )}
      </div>
    </article>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-4 border border-stone-200/80">
      <div className="flex-1 space-y-2.5">
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-7 w-28 rounded-lg mt-4" />
      </div>
      <div className="skeleton w-24 h-24 sm:w-28 sm:h-28 rounded-xl" />
    </div>
  );
}
