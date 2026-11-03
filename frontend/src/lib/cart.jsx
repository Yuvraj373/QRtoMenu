import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FREE_GIFT_MIN } from './offer';

const KEY = 'cart';
const CartContext = createContext(null);

const read = () => {
  try {
    const lines = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(lines) ? lines : [];
  } catch {
    return [];
  }
};

const lineKey = (id, size) => `${id}:${size || '-'}`;

export function CartProvider({ children }) {
  const [lines, setLines] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable: the cart just won't survive a reload
    }
  }, [lines]);

  const add = useCallback((item, size = null) => {
    const key = lineKey(item._id, size);
    const price = size === 'L' ? item.priceL : item.priceM;
    setLines((list) =>
      list.some((l) => l.key === key)
        ? list.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + 1, 20) } : l))
        : [...list, { key, id: item._id, name: item.name, image: item.image, category: item.category, isVeg: item.isVeg, size, price, qty: 1 }]
    );
  }, []);

  const change = useCallback((key, delta) => {
    setLines((list) => list.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + delta, 20) } : l)).filter((l) => l.qty > 0));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // Bring names/prices up to date with the live menu and drop items that were removed or sold out
  const syncWith = useCallback((items) => {
    const byId = new Map(items.map((i) => [i._id, i]));
    setLines((list) =>
      list.flatMap((l) => {
        const item = byId.get(l.id);
        if (!item || item.isAvailable === false || (l.size === 'L' && item.priceL == null)) return [];
        return [{ ...l, name: item.name, image: item.image, price: l.size === 'L' ? item.priceL : item.priceM }];
      })
    );
  }, []);

  const value = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      giftUnlocked: subtotal >= FREE_GIFT_MIN,
      qtyOf: (id, size) => (size === undefined ? lines.filter((l) => l.id === id).reduce((n, l) => n + l.qty, 0) : lines.find((l) => l.key === lineKey(id, size))?.qty || 0),
      keyOf: lineKey,
      add,
      inc: (key) => change(key, 1),
      dec: (key) => change(key, -1),
      clear,
      syncWith,
    };
  }, [lines, add, change, clear, syncWith]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export const useCart = () => useContext(CartContext);
