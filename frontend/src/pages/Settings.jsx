import { useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useSettings } from '../lib/SettingsContext';
import AdminLayout from '../Components/AdminLayout';
import { useToast } from '../Components/Toast';
import { PUBLIC_URL } from '../lib/config';
import { PhoneIcon, PinIcon } from '../Components/Icons';
import QRPoster from '../Components/QRPoster';

const PRESETS = ['#ef4444', '#f97316', '#eab308', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#1c1917'];

const inputCls =
  'w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl outline-none transition focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/15 text-sm font-medium text-stone-900 placeholder:text-stone-400';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-stone-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, description, children }) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
      <h2 className="font-extrabold text-stone-900">{title}</h2>
      {description && <p className="text-xs text-stone-500 mt-0.5 mb-5">{description}</p>}
      {children}
    </section>
  );
}

export default function Settings() {
  const toast = useToast();
  const { settings, setSettings } = useSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const saved = useRef(settings);

  // Settings arrive async from the provider; sync the form when they do
  useEffect(() => {
    setForm(settings);
    saved.current = settings;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings._id]);

  // Live-preview the theme colour across the app while editing
  useEffect(() => {
    if (/^#[0-9a-f]{6}$/i.test(form.themeColor)) document.documentElement.style.setProperty('--brand', form.themeColor);
  }, [form.themeColor]);

  // Revert the unsaved preview colour when leaving the page
  useEffect(() => () => document.documentElement.style.setProperty('--brand', saved.current.themeColor), []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const dirty = ['restaurantName', 'tagline', 'since', 'address', 'phone', 'themeColor', 'menuUrl'].some((k) => (form[k] ?? '') !== (settings[k] ?? ''));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.restaurantName.trim()) return toast('Restaurant name is required', 'error');
    setSaving(true);
    try {
      const res = await api.put('/settings', form);
      saved.current = res.data;
      setSettings(res.data);
      setForm(res.data);
      toast('Settings saved');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const menuUrl = form.menuUrl?.trim() || PUBLIC_URL;
  // A QR pointing at localhost / a LAN IP will not open on customers' phones
  const isLocalUrl = /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(menuUrl);


  return (
    <AdminLayout title="Settings" subtitle="Customize your restaurant details and how the menu looks">
      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6 min-w-0">
          <Card title="Restaurant details" description="Shown in the header of your menu">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Restaurant name">
                  <input type="text" value={form.restaurantName} onChange={set('restaurantName')} className={inputCls} required />
                </Field>
              </div>
              <Field label="Since">
                <input type="text" value={form.since} onChange={set('since')} className={inputCls} placeholder="Since 2021" />
              </Field>
              <Field label="Tagline">
                <input type="text" value={form.tagline} onChange={set('tagline')} className={inputCls} placeholder="Pure Veg" />
              </Field>
              <Field label="Phone">
                <input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
              </Field>
              <Field label="Address">
                <input type="text" value={form.address} onChange={set('address')} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Theme colour" description="The main brand colour of your menu">
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, themeColor: c }))}
                  aria-label={`Use ${c}`}
                  style={{ backgroundColor: c }}
                  className={`w-10 h-10 rounded-full transition ring-offset-2 ${form.themeColor?.toLowerCase() === c ? 'ring-2 ring-stone-900 scale-110' : 'hover:scale-105'}`}
                />
              ))}
              <label className="relative w-10 h-10 rounded-full border-2 border-dashed border-stone-300 grid place-items-center text-stone-500 text-lg cursor-pointer hover:border-stone-500" title="Custom colour">
                +
                <input type="color" value={form.themeColor} onChange={set('themeColor')} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
              <span className="ml-1 font-mono text-xs font-semibold text-stone-500 uppercase">{form.themeColor}</span>
            </div>
          </Card>

          <Card title="Menu link (QR code)" description="Once the site is live, enter your website address here — customers who scan the QR code land on this page">
            <Field label="Menu URL">
              <input type="url" inputMode="url" value={form.menuUrl ?? ''} onChange={set('menuUrl')} className={inputCls} placeholder={PUBLIC_URL} />
            </Field>
            <p className="mt-2 text-xs text-stone-500">If left empty, the current address is used: <span className="font-semibold text-stone-700 break-all">{PUBLIC_URL}</span></p>
          </Card>

          <div className={`${dirty ? 'sticky bottom-20 md:bottom-4 z-20 shadow-lg' : ''} flex flex-col-reverse sm:flex-row gap-3 sm:justify-end bg-white/90 backdrop-blur border border-stone-200 rounded-2xl p-3`}>
            {dirty && (
              <button type="button" onClick={() => setForm(settings)} className="h-12 px-5 rounded-xl bg-stone-100 text-stone-700 font-bold text-sm hover:bg-stone-200 transition">
                Discard
              </button>
            )}
            <button type="submit" disabled={saving || !dirty} className="h-12 px-8 rounded-xl bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition disabled:opacity-50">
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'All changes saved'}
            </button>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <section className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <p className="px-5 pt-4 pb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Live preview</p>
            <div className="mx-4 mb-4 rounded-xl overflow-hidden bg-brand text-white p-5 relative">
              <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/10" />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">{[form.since, form.tagline].filter(Boolean).join(' • ')}</p>
              <p className="relative mt-1 text-2xl font-extrabold leading-tight break-words">{form.restaurantName || 'Restaurant'}</p>
              <div className="relative mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                {form.address && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1"><PinIcon className="w-3 h-3" />{form.address}</span>}
                {form.phone && <span className="inline-flex items-center gap-1 rounded-full bg-white text-stone-900 px-2 py-1"><PhoneIcon className="w-3 h-3" />{form.phone}</span>}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-stone-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Menu QR poster</p>
            <p className="mt-1 mb-4 text-[11px] text-stone-500 break-all">QR opens: <span className="font-semibold text-stone-700">{menuUrl}</span></p>
            {isLocalUrl && (
              <p className="mb-4 text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl px-3 py-2.5">
                ⚠️ This is a local address — it won't open on customers' phones. Enter your live website address in &quot;Menu link&quot; above.
              </p>
            )}
            <QRPoster settings={form} url={menuUrl} />
            <p className="mt-3 text-center text-[11px] text-stone-400">Print it and place it on your tables — customers scan it to view the menu.</p>
          </section>
        </aside>
      </form>
    </AdminLayout>
  );
}
