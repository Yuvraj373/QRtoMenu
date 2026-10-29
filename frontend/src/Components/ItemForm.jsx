import { useEffect, useState } from 'react';
import api from '../lib/api';
import { CheckIcon, CloseIcon, ImageIcon, PlusIcon } from './Icons';
import VegMark from './VegMark';

const EMPTY = { name: '', priceM: '', priceL: '', category: '', description: '', image: '', isVeg: true, isSpecial: false, isAvailable: true };

const toForm = (item) =>
  item ? { ...EMPTY, ...item, priceL: item.priceL ?? '', description: item.description ?? '', image: item.image ?? '' } : EMPTY;

const inputCls =
  'w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl outline-none transition focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/15 text-sm font-medium text-stone-900 placeholder:text-stone-400';

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-bold text-stone-600">{label}</span>
        {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="block text-sm font-bold text-stone-800">{label}</span>
        {description && <span className="block text-xs text-stone-500">{description}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative w-11 h-6 shrink-0 rounded-full bg-stone-300 transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20 after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export default function ItemForm({ editingItem, categories, onSave, onClose, saving }) {
  const [form, setForm] = useState(() => toForm(editingItem));
  const [error, setError] = useState('');
  const [brokenImage, setBrokenImage] = useState('');
  const imgOk = brokenImage !== form.image;
  const [suggestions, setSuggestions] = useState([]);
  const [customUrl, setCustomUrl] = useState(false);

  // Fetch matching food photos as the admin types the name / category
  useEffect(() => {
    const name = form.name.trim();
    const category = form.category.trim();
    if (!name && !category) return;
    const t = setTimeout(() => {
      api
        .get('/items/image-suggestions', { params: { name, category, exclude: editingItem?._id } })
        .then((res) => setSuggestions(res.data.suggestions))
        .catch(() => setSuggestions([]));
    }, 350);
    return () => clearTimeout(t);
  }, [form.name, form.category, editingItem?._id]);

  const hasInput = form.name.trim() || form.category.trim();
  const autoPhoto = hasInput ? suggestions[0] : undefined;
  const preview = form.image || autoPhoto;
  const isCustom = form.image && !suggestions.includes(form.image);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const priceM = Number(form.priceM);
    const priceL = form.priceL === '' ? null : Number(form.priceL);
    if (!form.name.trim() || !form.category.trim()) return setError('Item name and category are required.');
    if (!(priceM > 0)) return setError('Price must be greater than 0.');
    if (priceL !== null && !(priceL > 0)) return setError('Enter a valid large price or leave it empty.');
    setError('');
    const saved = await onSave({ ...form, name: form.name.trim(), category: form.category.trim(), priceM, priceL });
    if (saved && !editingItem) setForm((f) => ({ ...EMPTY, category: f.category }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100">
        <div>
          <h2 className="font-extrabold text-lg text-stone-900">{editingItem ? 'Edit item' : 'Add new item'}</h2>
          <p className="text-xs text-stone-500">{editingItem ? `Editing “${editingItem.name}”` : 'Add a new item to the menu'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="lg:hidden grid place-items-center w-10 h-10 rounded-full bg-stone-100 text-stone-600">
          <CloseIcon />
        </button>
        {editingItem && (
          <button type="button" onClick={onClose} className="hidden lg:block text-sm font-bold text-stone-500 hover:text-stone-900">
            Cancel
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
        <Field label="Item name">
          <input type="text" value={form.name} onChange={(e) => set('name')(e.target.value)} className={inputCls} placeholder="e.g. Farm House Pizza" required />
        </Field>

        <Field label="Category" hint="Type a new one to create it">
          <input type="text" list="category-options" value={form.category} onChange={(e) => set('category')(e.target.value)} className={inputCls} placeholder="e.g. Veg Pizza" required />
          <datalist id="category-options">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>

        <div>
          <span className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-bold text-stone-600">Photo</span>
            <button type="button" onClick={() => setCustomUrl((v) => !v)} className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 underline-offset-2 hover:underline">
              {customUrl ? 'Show suggestions' : 'Use my own image link'}
            </button>
          </span>
          <div className="flex gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-white border border-stone-200 grid place-items-center text-stone-300">
              {preview && (preview !== form.image || imgOk) ? (
                <img src={preview} alt="" onError={() => form.image && setBrokenImage(form.image)} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8" />
              )}
              {!form.image && autoPhoto && (
                <span className="absolute bottom-1 left-1 rounded-md bg-stone-900/80 text-white text-[10px] font-bold px-1.5 py-0.5">✨ Auto</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {customUrl ? (
                <>
                  <input type="url" value={isCustom ? form.image : ''} onChange={(e) => set('image')(e.target.value)} className={inputCls} placeholder="https://…" />
                  <p className="mt-1.5 text-[11px] text-stone-500">{!imgOk && form.image ? '⚠️ This image didn\'t load — check the link' : 'Paste a direct link to any image'}</p>
                </>
              ) : hasInput && suggestions.length ? (
                <>
                  <p className="text-[11px] text-stone-500 leading-snug">{form.image ? 'Photo selected. Tap ✨ to go back to the automatic photo.' : 'A photo is picked automatically from the name. Want a different one? Choose below:'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => set('image')('')}
                      title="Auto photo"
                      className={`w-11 h-11 rounded-lg grid place-items-center text-base transition ${!form.image ? 'bg-stone-900 text-white ring-2 ring-brand ring-offset-1' : 'bg-white border border-stone-200 hover:border-stone-400'}`}
                    >
                      ✨
                    </button>
                    {suggestions.slice(0, 7).map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => set('image')(url)}
                        className={`w-11 h-11 rounded-lg overflow-hidden transition ${form.image === url ? 'ring-2 ring-brand ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
                      >
                        <img src={url.replace(/w=\d+/, 'w=120').replace(/h=\d+/, 'h=120')} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-stone-500 leading-snug pt-1">
                  {hasInput
                    ? 'No photo found for this name. Paste your own image link, or the category icon will be shown.'
                    : 'Type the item name (e.g. “Veg Fried Momos”) and a photo is added automatically.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (Regular / M)">
            <input type="number" inputMode="decimal" min="0" step="any" value={form.priceM} onChange={(e) => set('priceM')(e.target.value)} className={inputCls} placeholder="₹ 99" required />
          </Field>
          <Field label="Price (Large)" hint="Optional">
            <input type="number" inputMode="decimal" min="0" step="any" value={form.priceL} onChange={(e) => set('priceL')(e.target.value)} className={inputCls} placeholder="₹ 149" />
          </Field>
        </div>

        <Field label="Description" hint="Optional">
          <textarea rows={2} value={form.description} onChange={(e) => set('description')(e.target.value)} className={`${inputCls} h-auto py-3 resize-none`} placeholder="Ingredients, taste, etc." />
        </Field>

        <div>
          <span className="block text-xs font-bold text-stone-600 mb-1.5">Food type</span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
            {[true, false].map((veg) => (
              <button
                key={String(veg)}
                type="button"
                onClick={() => set('isVeg')(veg)}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-bold transition ${form.isVeg === veg ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
              >
                <VegMark isVeg={veg} /> {veg ? 'Veg' : 'Non-veg'}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-stone-100 border-y border-stone-100">
          <Toggle checked={form.isSpecial} onChange={set('isSpecial')} label="Chef's special" description="Shows a ⭐ badge on the menu" />
          <Toggle checked={form.isAvailable} onChange={set('isAvailable')} label="Available" description="When off, the item shows as “Sold out”" />
        </div>

        {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      </div>

      <div className="shrink-0 px-5 sm:px-6 py-4 pb-safe lg:pb-4 border-t border-stone-100 bg-white shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.15)]">
        <button type="submit" disabled={saving} className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white font-bold text-sm shadow-lg shadow-brand/25 hover:brightness-110 transition active:scale-[0.98] disabled:opacity-60">
          {saving ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : editingItem ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            <PlusIcon className="w-4 h-4" />
          )}
          {saving ? 'Saving…' : editingItem ? 'Update item' : 'Add item'}
        </button>
      </div>
    </form>
  );
}
