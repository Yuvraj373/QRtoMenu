import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api, { errorMessage } from '../lib/api';
import { useSettings } from '../lib/SettingsContext';
import { useCart } from '../lib/cart';
import { groupByCategory } from '../lib/menu';
import { FREE_GIFT_MIN, FREE_GIFT_NAME } from '../lib/offer';
import { getMyOrders, rememberOrder } from '../lib/myOrders';
import ItemCard, { ItemCardSkeleton } from '../Components/ItemCard';
import SearchBar from '../Components/SearchBar';
import VegMark from '../Components/VegMark';
import CartBar from '../Components/CartBar';
import SizeSheet from '../Components/SizeSheet';
import CheckoutSheet from '../Components/CheckoutSheet';
import { ArrowRightIcon, ExternalIcon, PhoneIcon, PinIcon, ReceiptIcon, RefreshIcon, StarIcon } from '../Components/Icons';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&q=75';
const GIFT_IMAGE = 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop&q=80';
const DEFAULT_REVIEW_URL = 'https://share.google/oZNCrAVVJFrvIMey7';

function Hero({ settings, table }) {
  const meta = [settings.since, settings.tagline].filter(Boolean).join(' • ');
  return (
    <header className="relative overflow-hidden bg-stone-900 text-white">
      <img src={HERO_IMAGE} alt="" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-950/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand/50 to-transparent mix-blend-multiply" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="flex flex-wrap items-center gap-2">
          {meta && <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/80">{meta}</p>}
          {table && <span className="rounded-full bg-white text-stone-900 px-2.5 py-1 text-[11px] font-extrabold">Table {table}</span>}
        </div>
        <h1 className="mt-3 text-[2.75rem] sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] drop-shadow-lg">{settings.restaurantName}</h1>
        <p className="mt-3 max-w-md text-sm sm:text-base text-white/80">Order from your table, pay on your phone — we&apos;ll bring it right to you.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={settings.googleReviewUrl || DEFAULT_REVIEW_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-stone-900 px-3.5 py-2 text-xs sm:text-sm font-bold hover:bg-white/90 transition"
          >
            <StarIcon className="w-4 h-4 text-amber-400" /> Rate us on Google
          </a>
          {settings.address && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3.5 py-2 text-xs sm:text-sm font-semibold">
              <PinIcon className="w-4 h-4" /> {settings.address}
            </span>
          )}
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3.5 py-2 text-xs sm:text-sm font-semibold hover:bg-white/25 transition">
              <PhoneIcon className="w-4 h-4" /> {settings.phone}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function OfferBanner({ giftItem }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 p-4 sm:p-5 flex items-center gap-4 shadow-xl shadow-amber-900/10">
      <div className="absolute -left-8 -bottom-12 w-36 h-36 rounded-full bg-white/30" />
      <div className="relative flex-1 min-w-0">
        <span className="inline-block rounded-full bg-stone-900 text-amber-300 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">Today&apos;s offer</span>
        <p className="mt-2 text-lg sm:text-2xl font-extrabold text-stone-900 leading-tight">FREE {FREE_GIFT_NAME} 🎁</p>
        <p className="text-xs sm:text-sm font-semibold text-stone-700">On every order of ₹{FREE_GIFT_MIN} or more — added automatically</p>
      </div>
      <img src={giftItem?.image || GIFT_IMAGE} alt={FREE_GIFT_NAME} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover rotate-3 ring-4 ring-white shadow-lg" />
    </div>
  );
}

function ActiveOrder() {
  const [order, setOrder] = useState(null);
  useEffect(() => {
    const [latest] = getMyOrders();
    if (!latest) return;
    api
      .get(`/orders/track/${latest.trackingId}`)
      .then((res) => ['new', 'preparing', 'ready'].includes(res.data.status) && setOrder(res.data))
      .catch(() => {});
  }, []);
  if (!order) return null;
  const label = { new: 'Order placed', preparing: 'Being prepared 👨‍🍳', ready: 'Ready — on its way 🛎️' }[order.status];
  return (
    <Link to={`/order/${order.trackingId}`} className="flex items-center gap-3 rounded-2xl bg-stone-900 text-white p-3.5 pr-4 hover:bg-stone-800 transition animate-fade-up">
      <span className="grid place-items-center w-11 h-11 rounded-xl bg-brand"><ReceiptIcon className="w-5 h-5" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-white/60 font-semibold">Your order #{order.number}</span>
        <span className="block font-bold">{label}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-bold">Track <ArrowRightIcon className="w-4 h-4" /></span>
    </Link>
  );
}

function ReviewCard({ url }) {
  return (
    <section className="mt-12 rounded-3xl bg-white border border-stone-200 p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
      <div className="flex-1">
        <div className="flex justify-center sm:justify-start gap-1 text-amber-400">
          {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} className="w-6 h-6" />)}
        </div>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Loved your food?</h2>
        <p className="mt-1 text-sm text-stone-500">Tell others on Google — it really helps a small restaurant like ours.</p>
        <a href={url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 h-12 px-5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition">
          Write a Google review <ExternalIcon className="w-4 h-4" />
        </a>
      </div>
      <div className="shrink-0 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200 text-center">
        <QRCodeSVG value={url} size={120} level="M" marginSize={0} />
        <p className="mt-2 text-[11px] font-bold text-stone-500">Scan to review</p>
      </div>
    </section>
  );
}

function VegToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={`shrink-0 flex items-center gap-2 h-12 px-3.5 rounded-2xl border text-sm font-bold transition ${
        value ? 'bg-green-50 border-green-600 text-green-700' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
      }`}
    >
      <VegMark isVeg /> <span className="hidden min-[380px]:inline">Veg only</span>
    </button>
  );
}

export default function Menu() {
  const { settings } = useSettings();
  const cart = useCart();
  const { syncWith } = cart;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const table = params.get('table')?.slice(0, 20) || '';
  const [sizeItem, setSizeItem] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [active, setActive] = useState('');
  const chipBar = useRef(null);
  const lockSpy = useRef(false);

  const load = useCallback(() => {
    api
      .get('/items')
      .then((res) => {
        setItems(res.data);
        syncWith(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        setError(errorMessage(err));
        setStatus('error');
      });
  }, [syncWith]);

  useEffect(load, [load]);

  const giftItem = useMemo(() => items.find((i) => i.name.toLowerCase() === FREE_GIFT_NAME.toLowerCase()), [items]);
  const reviewUrl = settings.googleReviewUrl || DEFAULT_REVIEW_URL;

  const placed = (order) => {
    rememberOrder(order);
    setCheckoutOpen(false);
    navigate(`/order/${order.trackingId}`);
  };

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter(
      (i) =>
        (!vegOnly || i.isVeg) &&
        (!q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
    );
    return groupByCategory(filtered);
  }, [items, search, vegOnly]);

  const resultCount = sections.reduce((n, s) => n + s.items.length, 0);
  const current = sections.some((s) => s.id === active) ? active : sections[0]?.id;

  // Scroll-spy: highlight the category whose section is at the top of the viewport
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (lockSpy.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-160px 0px -55% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active chip centred in the horizontal bar on phones
  useEffect(() => {
    const bar = chipBar.current;
    const chip = bar?.querySelector(`[data-id="${current}"]`);
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [current]);

  const goTo = (id) => {
    setActive(id);
    lockSpy.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => (lockSpy.current = false), 800);
  };

  return (
    <div className={`min-h-dvh bg-stone-50 ${cart.count ? 'pb-40' : ''}`}>
      <Hero settings={settings} table={table} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 -mt-12 sm:-mt-16 space-y-3">
        <OfferBanner giftItem={giftItem} />
        <ActiveOrder />
      </div>

      {/* Sticky search + category bar */}
      <div className="sticky top-0 z-20 mt-4 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex gap-2">
          <SearchBar value={search} onChange={setSearch} className="flex-1" />
          <VegToggle value={vegOnly} onChange={setVegOnly} />
        </div>
        {status === 'ready' && sections.length > 1 && (
          <div ref={chipBar} className="md:hidden flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-3 scroll-px-4">
            {sections.map((s) => (
              <button
                key={s.id}
                data-id={s.id}
                onClick={() => goTo(s.id)}
                className={`shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-bold border transition ${
                  current === s.id ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600'
                }`}
              >
                <span>{s.icon}</span> {s.category}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 md:grid md:grid-cols-[210px_1fr] lg:grid-cols-[240px_1fr] md:gap-8">
        {/* Desktop / tablet category sidebar */}
        <aside className="hidden md:block">
          <nav className="sticky top-24 space-y-1 max-h-[calc(100dvh-7rem)] overflow-y-auto hide-scrollbar">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-stone-400">Categories</p>
            {status === 'loading' &&
              Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-11 rounded-xl" />)}
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                className={`w-full flex items-center gap-3 h-11 px-3 rounded-xl text-left text-sm font-bold transition ${
                  current === s.id ? 'bg-white text-brand shadow-sm ring-1 ring-stone-200' : 'text-stone-600 hover:bg-white/70'
                }`}
              >
                <span className="text-lg">{s.icon}</span>
                <span className="flex-1 truncate">{s.category}</span>
                <span className={`text-xs tabular-nums ${current === s.id ? 'text-brand' : 'text-stone-400'}`}>{s.items.length}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {status === 'loading' && (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => <ItemCardSkeleton key={i} />)}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-16 px-6 bg-white rounded-3xl border border-stone-200">
              <div className="text-5xl">😕</div>
              <h2 className="mt-4 text-lg font-extrabold">Couldn't load the menu</h2>
              <p className="mt-1 text-sm text-stone-500">{error}</p>
              <button onClick={() => { setStatus('loading'); load(); }} className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-stone-900 text-white text-sm font-bold">
                <RefreshIcon className="w-4 h-4" /> Try again
              </button>
            </div>
          )}

          {status === 'ready' && (search || vegOnly) && (
            <p className="mb-4 text-sm text-stone-500">
              <span className="font-bold text-stone-900">{resultCount}</span> {resultCount === 1 ? 'item' : 'items'} found
              {search && <> for “<span className="font-semibold text-stone-900">{search}</span>”</>}
            </p>
          )}

          {status === 'ready' && sections.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="text-5xl">🔍</div>
              <h2 className="mt-4 text-lg font-extrabold">{items.length ? 'No items found' : 'The menu is empty'}</h2>
              <p className="mt-1 text-sm text-stone-500">{items.length ? 'Try searching for something else.' : 'Items will be added soon.'}</p>
              {(search || vegOnly) && (
                <button onClick={() => { setSearch(''); setVegOnly(false); }} className="mt-5 h-11 px-5 rounded-xl bg-stone-900 text-white text-sm font-bold">
                  Clear filters
                </button>
              )}
            </div>
          )}

          <div className="space-y-8 sm:space-y-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-36 md:scroll-mt-24">
                <h2 className="flex items-center gap-2 mb-3 sm:mb-4 text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900">
                  <span>{s.icon}</span> {s.category}
                  <span className="ml-1 text-sm font-semibold text-stone-400">({s.items.length})</span>
                </h2>
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                  {s.items.map((item) => (
                    <div key={item._id} className="animate-fade-up">
                      <ItemCard
                        item={item}
                        qty={cart.qtyOf(item._id)}
                        onAdd={() => (item.priceL != null ? setSizeItem(item) : cart.add(item))}
                        onInc={() => cart.inc(cart.keyOf(item._id, null))}
                        onDec={() => cart.dec(cart.keyOf(item._id, null))}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {status === 'ready' && <ReviewCard url={reviewUrl} />}
        </main>
      </div>

      <footer className="border-t border-stone-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-stone-500">
          <div>
            <p className="font-extrabold text-stone-900">{settings.restaurantName}</p>
            {settings.address && <p className="mt-0.5">{settings.address}</p>}
          </div>
          <p className="text-xs">Payments on this site are in demo mode.</p>
        </div>
      </footer>

      {!checkoutOpen && !sizeItem && <CartBar onOpen={() => setCheckoutOpen(true)} />}
      <SizeSheet item={sizeItem} onClose={() => setSizeItem(null)} />
      <CheckoutSheet open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onPlaced={placed} giftItem={giftItem} defaultTable={table} />
    </div>
  );
}
