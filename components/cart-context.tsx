'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { priceCart, type CartAddOn, type CartLine, type PricedCart } from '@/lib/shop';

const STORAGE_KEY = 'jj.cart.v1';

type CartContextValue = {
  lines: CartLine[];
  priced: PricedCart;
  count: number;
  /** True until localStorage has been read, so the UI can avoid flashing an empty cart. */
  ready: boolean;
  addLine: (slug: string, addOns: CartAddOn[], qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Two monograms with different initials are different things to make, so
 * they cannot share a cart line. The key is derived from
 * the full specification, which means adding an identical configuration
 * twice correctly merges into one line at quantity two.
 */
function lineKey(slug: string, addOns: CartAddOn[]): string {
  const spec = [...addOns]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => `${a.id}:${a.qty ?? 1}:${a.value ?? ''}`)
    .join('|');
  return `${slug}::${spec}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // localStorage does not exist while the page is being pre-rendered at build
  // time, so the cart loads after mount. Rendering an empty cart first and
  // filling it in avoids a hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {
      // A corrupt or unreadable cart is not worth breaking the page over.
      // Starting empty is the right recovery.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private browsing and full quotas both throw here. The cart still works
      // for this session; it just will not survive a reload.
    }
  }, [lines, ready]);

  const addLine = useCallback((slug: string, addOns: CartAddOn[], qty = 1) => {
    const key = lineKey(slug, addOns);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { key, slug, qty, addOns }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty } : l)),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // Priced with the same module the Cloud Function uses, so what the customer
  // sees here and what Square charges are computed by identical code.
  const priced = useMemo(() => priceCart(lines), [lines]);

  const count = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);

  const value = useMemo(
    () => ({ lines, priced, count, ready, addLine, setQty, removeLine, clear }),
    [lines, priced, count, ready, addLine, setQty, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
