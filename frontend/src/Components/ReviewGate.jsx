import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Sheet from './Sheet';
import api, { errorMessage } from '../lib/api';
import { StarIcon, ExternalIcon, CheckIcon } from './Icons';

const LABELS = ['', 'Poor', 'Could be better', 'Good', 'Very good', 'Loved it!'];

export function Stars({ value, onChange, size = 'w-10 h-10' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={!onChange}
          className={`transition ${onChange ? 'active:scale-90 hover:scale-110' : ''} ${n <= shown ? 'text-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.5)]' : 'text-stone-200'}`}
        >
          <StarIcon className={size} />
        </button>
      ))}
    </div>
  );
}

// Shown right after payment and can't be skipped: rate, then leave a Google review
export default function ReviewGate({ order, reviewUrl, onDone }) {
  const openedKey = `reviewOpened:${order.trackingId}`;
  const [rating, setRating] = useState(0);
  const [opened, setOpened] = useState(() => {
    try {
      return sessionStorage.getItem(openedKey) === '1';
    } catch {
      return false;
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openGoogle = () => {
    setOpened(true);
    try {
      sessionStorage.setItem(openedKey, '1');
    } catch {
      // fine
    }
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/orders/track/${order.trackingId}/review`, { rating });
      onDone(res.data);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Sheet open dismissable={false}>
      <div className="overflow-y-auto">
        <div className="relative px-6 pt-9 pb-6 text-center bg-gradient-to-b from-amber-50 to-white">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">One last step</span>
          <h2 className="mt-3 text-2xl font-extrabold text-stone-900 leading-tight">How was your experience?</h2>
          <p className="mt-1 text-sm text-stone-500">Your review helps us a lot — it takes just 10 seconds 🙏</p>
          <div className="mt-5">
            <Stars value={rating} onChange={setRating} />
            <p className="mt-2 h-5 text-sm font-bold text-amber-600">{LABELS[rating]}</p>
          </div>
        </div>

        <div className={`px-6 pb-6 transition ${rating ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="rounded-3xl border-2 border-stone-100 p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-stone-900 text-white text-xs">2</span>
              Share your review on Google
            </p>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noreferrer"
              onClick={openGoogle}
              className={`mt-4 w-full h-13 inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold text-[15px] transition ${
                opened ? 'bg-green-50 text-green-700 border-2 border-green-200' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700'
              }`}
            >
              {opened ? <CheckIcon className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
              {opened ? 'Google review opened' : 'Write a review on Google'}
              {!opened && <ExternalIcon className="w-4 h-4 opacity-70" />}
            </a>
            <div className="mt-4 flex items-center gap-4">
              <div className="shrink-0 rounded-xl bg-white p-2 ring-1 ring-stone-200">
                <QRCodeSVG value={reviewUrl} size={84} level="M" marginSize={0} />
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Or scan this code with another phone to open our Google review page.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-4 pb-safe border-t border-stone-100">
        {error && <p className="mb-3 text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!rating || !opened || saving}
          className="w-full h-14 rounded-2xl bg-stone-900 text-white font-extrabold text-base transition hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400"
        >
          {saving ? 'Saving…' : !rating ? 'Tap the stars to rate' : !opened ? 'Write your Google review to continue' : 'Done — track my order'}
        </button>
      </div>
    </Sheet>
  );
}
