/**
 * GA4 for a statically exported storefront.
 *
 * Every function here is a no-op when NEXT_PUBLIC_GA_ID is unset, which is the
 * case during local development and on any fork. That means event calls can be
 * placed inline in components without guarding each one, and nothing is sent
 * from a developer's machine into the production property.
 *
 * The measurement ID is public by design. It ships in the client bundle of
 * every GA-instrumented site on the web; there is nothing to protect here.
 */

import type { PricedCart, PricedLine } from './shop';

export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? '').trim();

/** True when a measurement ID was baked into this build. */
export const analyticsEnabled = /^G-[A-Z0-9]+$/.test(GA_ID);

type GtagArgs =
  | ['js', Date]
  | ['config', string, Record<string, unknown>?]
  | ['event', string, Record<string, unknown>?]
  | ['set', Record<string, unknown>];

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: GtagArgs) => void;
  }
}

/**
 * Creates the dataLayer queue and configures the property, once.
 *
 * gtag.js is loaded async, so anything the site sends before it arrives has
 * to be queued. GA4 also discards events queued ahead of their `config`, and
 * a product page can fire view_item during hydration, which is earlier than
 * any script tag reliably runs. Bootstrapping from here rather than from a
 * <Script> tag means the first caller wins the race and the ordering holds
 * whichever way it goes.
 */
function ensureGtag(): NonNullable<Window['gtag']> {
  if (!window.gtag) {
    const queue = (window.dataLayer ??= []);
    // gtag.js reads each dataLayer entry as an arguments object, not as an
    // array, so this indirection is required and cannot be an arrow function.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      queue.push(arguments);
    } as NonNullable<Window['gtag']>;

    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      // Views are sent from the router effect in components/analytics.tsx
      // instead, so a client-side navigation is counted the same way a hard
      // load is. Turn off "Page changes based on browser history events" in
      // the property's enhanced measurement settings or views double-count.
      send_page_view: false,
    });
  }
  return window.gtag;
}

function send(...args: GtagArgs): void {
  if (!analyticsEnabled || typeof window === 'undefined') return;
  ensureGtag()(...args);
}

/** Queues js + config even on a page where no event happens to fire. */
export function initAnalytics(): void {
  if (!analyticsEnabled || typeof window === 'undefined') return;
  ensureGtag();
}

export function track(name: string, params: Record<string, unknown> = {}): void {
  send('event', name, params);
}

/**
 * GA4 counts a page_view per config call, and the App Router does client-side
 * navigation, so the script is configured with send_page_view: false and each
 * view is sent from here instead. Enhanced measurement's history-based page
 * views are left off for the same reason: two sources would double-count.
 */
export function trackPageView(path: string): void {
  send('event', 'page_view', {
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
  });
}

/* ------------------------------------------------------------------ *
 * Ecommerce
 *
 * GA4's ecommerce reports only populate from the reserved event names with
 * the reserved `items` array shape, so these builders exist to keep every
 * call site emitting the same fields. Prices are converted from the catalog's
 * cents to the dollars GA4 expects exactly once, here.
 * ------------------------------------------------------------------ */

type GaItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

const dollars = (cents: number): number => Math.round(cents) / 100;

/** The chosen options, flattened into the one variant string GA4 allows. */
function variantOf(line: PricedLine): string | undefined {
  const parts = line.addOns
    .map((a) => (a.value ? `${a.label}: ${a.value}` : a.label))
    .filter(Boolean);
  return parts.length ? parts.join(', ').slice(0, 100) : undefined;
}

function itemFromPricedLine(line: PricedLine): GaItem {
  return {
    item_id: line.slug,
    item_name: line.name,
    item_category: 'Necklaces',
    item_variant: variantOf(line),
    // Unit price including the add-ons on that unit, so price * quantity
    // reconciles with the line total in GA4's reports.
    price: dollars(line.qty > 0 ? line.lineCents / line.qty : line.unitCents),
    quantity: line.qty,
  };
}

export function trackViewItem(slug: string, name: string, priceCents: number): void {
  track('view_item', {
    currency: 'USD',
    value: dollars(priceCents),
    items: [
      {
        item_id: slug,
        item_name: name,
        item_category: 'Necklaces',
        price: dollars(priceCents),
        quantity: 1,
      },
    ],
  });
}

export function trackAddToCart(priced: PricedCart): void {
  track('add_to_cart', {
    currency: 'USD',
    value: dollars(priced.subtotalCents),
    items: priced.lines.map(itemFromPricedLine),
  });
}

export function trackViewCart(priced: PricedCart): void {
  track('view_cart', {
    currency: 'USD',
    value: dollars(priced.subtotalCents),
    items: priced.lines.map(itemFromPricedLine),
  });
}

export function trackRemoveFromCart(line: PricedLine): void {
  track('remove_from_cart', {
    currency: 'USD',
    value: dollars(line.lineCents),
    items: [itemFromPricedLine(line)],
  });
}

export function trackAddShippingInfo(priced: PricedCart, shippingCents: number): void {
  track('add_shipping_info', {
    currency: 'USD',
    value: dollars(priced.subtotalCents),
    shipping: dollars(shippingCents),
    shipping_tier: 'USPS Ground Advantage',
    items: priced.lines.map(itemFromPricedLine),
  });
}

/* ------------------------------------------------------------------ *
 * Purchase
 *
 * Square hosts the payment page, so the browser leaves this origin and comes
 * back to /success/ with only an order id in the query string. The static
 * site has no server to look the order up with, so the cart is written to
 * localStorage at begin_checkout and read back on return.
 *
 * localStorage rather than sessionStorage: Square's redirect can land in a
 * different tab (Apple Pay on iOS does this), and sessionStorage does not
 * cross tabs. The record is deleted as soon as it is used.
 * ------------------------------------------------------------------ */

const PENDING_KEY = 'eg.checkout.pending.v1';
const FIRED_KEY = 'eg.purchase.fired.v1';

export type PendingCheckout = {
  items: GaItem[];
  valueCents: number;
  shippingCents: number;
  at: number;
};

/** Stale enough that the buyer almost certainly started a different order. */
const PENDING_TTL_MS = 6 * 60 * 60 * 1000;

export function trackBeginCheckout(priced: PricedCart, shippingCents: number): void {
  const items = priced.lines.map(itemFromPricedLine);

  track('begin_checkout', {
    currency: 'USD',
    value: dollars(priced.subtotalCents),
    items,
  });

  if (typeof window === 'undefined') return;
  try {
    const pending: PendingCheckout = {
      items,
      valueCents: priced.subtotalCents,
      shippingCents,
      at: Date.now(),
    };
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Private browsing throws on write. The purchase event is then sent with
    // the transaction id alone, which still counts the conversion.
  }
}

function readPending(): PendingCheckout | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - parsed.at > PENDING_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Sends purchase exactly once per Square order id.
 *
 * The success page is a URL a buyer can refresh, bookmark, or reach on the
 * back button, and each of those would otherwise re-report the same sale.
 * GA4 does dedupe repeated transaction_ids, but not reliably across sessions,
 * so the ids already reported are kept here as well.
 */
export function trackPurchase(transactionId: string): void {
  if (!analyticsEnabled || typeof window === 'undefined' || !transactionId) return;

  let fired: string[] = [];
  try {
    fired = JSON.parse(window.localStorage.getItem(FIRED_KEY) ?? '[]');
    if (!Array.isArray(fired)) fired = [];
  } catch {
    fired = [];
  }
  if (fired.includes(transactionId)) return;

  const pending = readPending();

  track('purchase', {
    transaction_id: transactionId,
    currency: 'USD',
    value: dollars((pending?.valueCents ?? 0) + (pending?.shippingCents ?? 0)),
    shipping: dollars(pending?.shippingCents ?? 0),
    items: pending?.items ?? [],
  });

  try {
    window.localStorage.removeItem(PENDING_KEY);
    // Keep the tail short. A buyer who has placed 20 orders is not going to
    // have a stale success tab open from the first one.
    window.localStorage.setItem(FIRED_KEY, JSON.stringify([...fired, transactionId].slice(-20)));
  } catch {
    // Nothing recoverable, and the event has already been sent.
  }
}

/* ------------------------------------------------------------------ *
 * Email capture
 * ------------------------------------------------------------------ */

export function trackSignUp(source: string): void {
  track('generate_lead', { method: 'email_signup', source });
}
