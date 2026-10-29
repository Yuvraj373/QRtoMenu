import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    // Skip duplicates (e.g. the same error from a retried request)
    setToasts((t) => (t.some((x) => x.message === message) ? t : [...t, { id, message, type }]));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed z-[60] inset-x-0 bottom-20 md:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-up pointer-events-auto max-w-sm w-full sm:w-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${
              t.type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white'
            }`}
          >
            {t.type === 'error' ? '⚠️ ' : '✓ '}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext);
