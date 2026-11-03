import { useEffect } from 'react';

// Keeps the phone screen from turning off while `active` (where supported), so an
// open order page can still ring out loud. Released automatically when inactive.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null;
    let done = false;
    const request = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => (done ? l.release() : (lock = l)))
        .catch(() => {});
    };
    request();
    // The browser drops the lock when the tab is hidden; take it again on return
    document.addEventListener('visibilitychange', request);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
