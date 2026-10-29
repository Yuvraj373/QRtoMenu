import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useSettings } from '../lib/SettingsContext';
import { groupByCategory } from '../lib/menu';
import ItemCard, { ItemCardSkeleton } from '../Components/ItemCard';
import SearchBar from '../Components/SearchBar';
import VegMark from '../Components/VegMark';
import { PhoneIcon, PinIcon, RefreshIcon } from '../Components/Icons';

function Hero({ settings }) {
  const meta = [settings.since, settings.tagline].filter(Boolean).join(' • ');
  return (
    <header className="relative overflow-hidden bg-brand text-white">
      {/* soft decorative shapes */}
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10" />
      <div className="absolute -bottom-28 -left-10 w-64 h-64 rounded-full bg-black/10" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8 sm:pt-14 sm:pb-12">
        {meta && <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/80">{meta}</p>}
        <h1 className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">{settings.restaurantName}</h1>
        {(settings.address || settings.phone) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {settings.address && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-xs sm:text-sm font-semibold">
                <PinIcon className="w-4 h-4" /> {settings.address}
              </span>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-white text-stone-900 px-3 py-1.5 text-xs sm:text-sm font-bold hover:bg-white/90 transition">
                <PhoneIcon className="w-4 h-4" /> {settings.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </header>
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
        setStatus('ready');
      })
      .catch((err) => {
        setError(errorMessage(err));
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

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
    <div className="min-h-dvh bg-stone-50">
      <Hero settings={settings} />

      {/* Sticky search + category bar */}
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/70">
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
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>

      <footer className="border-t border-stone-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-stone-500">
          <div>
            <p className="font-extrabold text-stone-900">{settings.restaurantName}</p>
            {settings.address && <p className="mt-0.5">{settings.address}</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}
