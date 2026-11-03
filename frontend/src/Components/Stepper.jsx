import { MinusIcon, PlusIcon } from './Icons';

export default function Stepper({ qty, onInc, onDec, small = false }) {
  const btn = `grid place-items-center ${small ? 'w-8 h-8' : 'w-9 h-9'} rounded-full transition active:scale-90 hover:bg-white/15`;
  return (
    <div className={`inline-flex items-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 ${small ? 'h-8' : 'h-9'}`}>
      <button type="button" onClick={onDec} aria-label="Remove one" className={btn}>
        <MinusIcon className="w-4 h-4" />
      </button>
      <span className={`${small ? 'min-w-5 text-sm' : 'min-w-6 text-[15px]'} text-center font-extrabold tabular-nums`}>{qty}</span>
      <button type="button" onClick={onInc} aria-label="Add one" className={btn}>
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
