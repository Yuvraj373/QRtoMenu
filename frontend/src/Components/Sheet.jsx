import { useEffect } from 'react';

let openSheets = 0;

// Bottom sheet on phones, centred dialog on larger screens
export default function Sheet({ open, onClose, children, dismissable = true, wide = false }) {
  useEffect(() => {
    if (!open) return;
    openSheets += 1;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && dismissable && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      openSheets -= 1;
      if (!openSheets) document.body.style.overflow = '';
    };
  }, [open, dismissable, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-950/55 backdrop-blur-[3px] animate-fade-in" onClick={dismissable ? onClose : undefined} />
      <div className={`relative w-full ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'} max-h-[94dvh] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-sheet-up sm:animate-pop`}>
        <div className="sm:hidden absolute top-2 inset-x-0 mx-auto w-10 h-1.5 rounded-full bg-stone-300/90 z-10" />
        {children}
      </div>
    </div>
  );
}
