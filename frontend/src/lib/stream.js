import { auth } from './api';

const BASE = import.meta.env.VITE_API_URL || '/api';

// Minimal Server-Sent Events client on top of fetch, so the admin token can travel in a
// header (EventSource can't send headers). Reconnects with backoff; returns stop().
export function subscribe(path, { onEvent, onStatus, withAuth = false }) {
  let stopped = false;
  let retry = 1000;
  let timer;
  let ctrl;

  const dispatch = (chunk) => {
    let event = 'message';
    let data = '';
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    try {
      onEvent(event, JSON.parse(data));
    } catch {
      // ignore malformed messages
    }
  };

  const connect = async () => {
    ctrl = new AbortController();
    try {
      const headers = withAuth && auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
      const res = await fetch(BASE + path, { headers, signal: ctrl.signal, cache: 'no-store' });
      if (res.status === 401 || res.status === 404) return onStatus?.('closed', res.status);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      retry = 1000;
      onStatus?.('live');
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          dispatch(buffer.slice(0, end));
          buffer = buffer.slice(end + 2);
        }
      }
    } catch {
      // network drop / server restart: fall through to reconnect
    }
    if (stopped) return;
    onStatus?.('reconnecting');
    timer = setTimeout(connect, retry);
    retry = Math.min(retry * 2, 15000);
  };

  connect();
  return () => {
    stopped = true;
    clearTimeout(timer);
    ctrl?.abort();
  };
}
