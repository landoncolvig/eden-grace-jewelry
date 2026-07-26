/**
 * Typed view onto the shared catalog and pricing modules.
 *
 * Those two files are plain CommonJS so the Cloud Function can require() them
 * with no build step. This wrapper puts TypeScript types over them for the
 * storefront without copying any data, so there is still exactly one place
 * where a price is written down.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const catalog = require('../shared/catalog.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pricing = require('../shared/pricing.js');

export type AddOn = {
  id: string;
  label: string;
  note: string;
  priceCents: number;
  weightOz: number;
  maxQty?: number;
  input?: { placeholder: string; maxLength: number };
};

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  weightOz: number;
  material: string;
  leadTime: string;
  swatch: string;
  addOns: AddOn[];
};

/** What the browser stores and sends. Never contains a price. */
export type CartAddOn = { id: string; qty?: number; value?: string };
export type CartLine = { key: string; slug: string; qty: number; addOns: CartAddOn[] };

export type PricedAddOn = {
  id: string;
  label: string;
  qty: number;
  value: string;
  priceCents: number;
};

export type PricedLine = {
  slug: string;
  name: string;
  qty: number;
  unitCents: number;
  lineCents: number;
  weightOz: number;
  addOns: PricedAddOn[];
  description: string;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  totalWeightOz: number;
  dropped: string[];
};

export const PRODUCTS: Product[] = catalog.PRODUCTS;
export const FREE_SHIPPING_THRESHOLD_CENTS: number | null =
  catalog.FREE_SHIPPING_THRESHOLD_CENTS;
export const FALLBACK_SHIPPING_CENTS: number = catalog.FALLBACK_SHIPPING_CENTS;

export const getProduct = catalog.getProduct as (slug: string) => Product | undefined;
export const getAddOn = catalog.getAddOn as (
  product: Product,
  addOnId: string,
) => AddOn | undefined;
export const formatUSD = catalog.formatUSD as (cents: number) => string;

export const priceCart = pricing.priceCart as (
  lines: Array<{ slug: string; qty: number; addOns?: CartAddOn[] }>,
) => PricedCart;

export const applyShippingRules = pricing.applyShippingRules as (
  subtotalCents: number,
  quotedCents: number,
) => { chargedCents: number; free: boolean; quotedCents: number };

/** Base URL of the Cloud Function that holds the Stripe and Shippo keys. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');
