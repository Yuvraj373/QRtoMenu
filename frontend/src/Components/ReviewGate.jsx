import { useState } from 'react';
import Sheet from './Sheet';
import api, { errorMessage } from '../lib/api';
import { StarIcon } from './Icons';

const LABELS = ['', 'Poor 😞', 'Could be better 😐', 'Good 🙂', 'Very good 😋', 'Loved it! 🤩'];
// Must match REVIEW_TAGS in backend/routes/orders.js
const REVIEW_TAGS = ['Tasty food', 'Quick service', 'Good value', 'Friendly staff', 'Hot & fresh', 'Big portions'];

export function Stars({ value, onChange, size = 'w-10 h-10' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  // Read-only stars are a picture, not five disabled buttons
  if (!onChange) {
    return (
      <div className="flex justify-center gap-1.5" role="img" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} className={`${size} ${n <= value ? 'text-amber-400' : 'text-stone-200'}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`transition active:scale-90 hover:scale-110 ${n <= shown ? 'text-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.5)]' : 'text-stone-200'}`}
        >
          <StarIcon className={size} />
        </button>
      ))}
    </div>
  );
}

// Shown right after payment and can't be skipped. Everything happens on this page —
// the review is saved with the order and shown to the restaurant.
export default function ReviewGate({ order, onDone }) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (tag) => setTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/orders/track/${order.trackingId}/review`, { rating, tags, comment });
      onDone(res.data);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Sheet open dismissable={false}>
      <div className="overflow-y-auto">
        <div className="px-6 pt-9 pb-5 text-center bg-gradient-to-b from-amber-50 to-white">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">One last step</span>
          <h2 className="mt-3 text-2xl font-extrabold text-stone-900 leading-tight">How was your experience?</h2>
          <p className="mt-1 text-sm text-stone-500">Takes 10 seconds — it really helps us 🙏</p>
          <div className="mt-5">
            <Stars value={rating} onChange={setRating} />
            <p className="mt-2 h-5 text-sm font-bold text-amber-600">{LABELS[rating]}</p>
          </div>
        </div>

        <div className={`px-6 pb-6 space-y-4 transition ${rating ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{rating >= 4 ? 'What did you like?' : 'What stood out?'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    aria-pressed={on}
                    className={`h-9 px-3.5 rounded-full text-[13px] font-bold border transition active:scale-95 ${on ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'}`}
                  >
                    {on && '✓ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={rating && rating <= 3 ? 'Tell us what we can do better (optional)' : 'Write a few words about your order (optional)'}
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none transition focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/15 text-sm font-medium text-stone-900 placeholder:text-stone-400 resize-none"
          />
        </div>
      </div>

      <div className="shrink-0 p-4 pb-safe border-t border-stone-100">
        {error && <p className="mb-3 text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!rating || saving}
          className="w-full h-14 rounded-2xl bg-stone-900 text-white font-extrabold text-base transition hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400"
        >
          {saving ? 'Saving…' : !rating ? 'Tap the stars to rate' : 'Submit review — track my order'}
        </button>
      </div>
    </Sheet>
  );
}
