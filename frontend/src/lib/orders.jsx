import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { auth, errorMessage } from './api';
import { subscribe } from './stream';
import { playChime } from './sound';
import { LOGIN_PATH } from './config';
import { useToast } from '../Components/Toast';

const OrdersContext = createContext(null);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const upsert = (list, order) => {
  const i = list.findIndex((o) => o._id === order._id);
  if (i < 0) return [order, ...list];
  const next = list.slice();
  next[i] = order;
  return next;
};

// Admin-wide live orders: one stream for every admin page, so a new order rings
// even while the admin is editing the menu or settings
export function OrdersProvider({ children }) {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState('connecting');
  const known = useRef(null);

  const load = useCallback(
    () =>
      api
        .get('/orders', { params: { since: startOfToday().toISOString() } })
        .then((res) => {
          setOrders(res.data);
          known.current = new Set(res.data.map((o) => o._id));
          setLoaded(true);
        })
        .catch(() => {}),
    []
  );

  useEffect(
    () =>
      subscribe('/orders/stream', {
        withAuth: true,
        onStatus: (status, code) => {
          if (code === 401) {
            auth.clear();
            window.location.assign(LOGIN_PATH);
            return;
          }
          setConnection(status);
          // (Re)connected: fetch the list again so nothing missed while offline is lost
          if (status === 'live') load();
        },
        onEvent: (event, order) => {
          if (event !== 'order') return;
          setOrders((list) => upsert(list, order));
          if (known.current && !known.current.has(order._id)) {
            known.current.add(order._id);
            playChime();
            navigator.vibrate?.([200, 100, 200]);
            toast(`New order #${order.number} · Table ${order.table}`);
          }
        },
      }),
    [load, toast]
  );

  const newCount = orders.filter((o) => o.status === 'new').length;

  // "(2) New orders" in the browser tab so it's visible from other tabs too
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = newCount ? `(${newCount}) ${base}` : base;
  }, [newCount]);

  const updateStatus = useCallback(
    async (order, status) => {
      setOrders((list) => upsert(list, { ...order, status }));
      try {
        const res = await api.patch(`/orders/${order._id}/status`, { status });
        setOrders((list) => upsert(list, res.data));
      } catch (err) {
        setOrders((list) => upsert(list, order));
        toast(errorMessage(err), 'error');
      }
    },
    [toast]
  );

  const value = useMemo(() => ({ orders, loaded, connection, newCount, updateStatus, reload: load }), [orders, loaded, connection, newCount, updateStatus, load]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export const useOrders = () => useContext(OrdersContext);
