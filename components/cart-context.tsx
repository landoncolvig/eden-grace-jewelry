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
import {
  getMaxPurchaseQuantity,
  getProduct,
  priceCart,
  type CartAddOn,
  type CartLine,
  type PricedCart,
} from '@/lib/shop';

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

function productLimit(slug: string): number {
  const product = getProduct(slug);
  return product ? getMaxPurchaseQuantity(product) : 0;
}

function normalizeLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];

  const used = new Map<string, number>();
  const normalized: CartLine[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue;
    const line = candidate as Partial<CartLine>;
    if (
      typeof line.key !== 'string' ||
      typeof line.slug !== 'string' ||
      !Array.isArray(line.addOns)
    ) {
      continue;
    }

    const limit = productLimit(line.slug);
    const alreadyUsed = used.get(line.slug) ?? 0;
    const requested = Math.max(1, Math.floor(Number(line.qty) || 1));
    const qty = Math.min(requested, Math.max(0, limit - alreadyUsed));
    if (qty === 0) continue;

    normalized.push({ key: line.key, slug: line.slug, qty, addOns: line.addOns });
    used.set(line.slug, alreadyUsed + qty);
  }

  return normalized;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // localStorage does not exist while the page is being pre-rendered at build
  // time, so the cart loads after mount. Rendering an empty cart first and
  // filling it in avoids a hydration mismatch.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setLines(normalizeLines(parsed));
        }
      } catch {
        // A corrupt or unreadable cart is not worth breaking the page over.
        // Starting empty is the right recovery.
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
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
      const limit = productLimit(slug);
      const used = prev.reduce((sum, line) => sum + (line.slug === slug ? line.qty : 0), 0);
      const addQty = Math.min(Math.max(1, Math.floor(qty)), Math.max(0, limit - used));
      if (addQty === 0) return prev;

      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + addQty } : l));
      }
      return [...prev, { key, slug, qty: addQty, addOns }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => {
            if (l.key !== key) return l;
            const usedByOtherLines = prev.reduce(
              (sum, other) => sum + (other.slug === l.slug && other.key !== key ? other.qty : 0),
              0,
            );
            const nextQty = Math.min(
              Math.max(1, Math.floor(qty)),
              Math.max(1, productLimit(l.slug) - usedByOtherLines),
            );
            return { ...l, qty: nextQty };
          }),
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
