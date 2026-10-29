export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-6 pb-safe sm:pb-6 shadow-2xl animate-sheet-up sm:animate-fade-up">
        <h3 className="text-lg font-extrabold text-stone-900">{title}</h3>
        <p className="mt-1.5 text-sm text-stone-500">{message}</p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
          <button type="button" onClick={onCancel} className="flex-1 h-12 rounded-xl bg-stone-100 font-bold text-sm text-stone-700 hover:bg-stone-200 transition">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="flex-1 h-12 rounded-xl bg-red-600 font-bold text-sm text-white hover:bg-red-700 transition disabled:opacity-60">
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
