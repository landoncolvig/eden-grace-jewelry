/**
 * The catalog is the single source of truth for prices and weights.
 *
 * Both the storefront and the Cloud Function import this file. The storefront
 * uses it to render; the function uses it to price. That matters: the browser
 * only ever sends item ids and add-on ids, and the function re-derives every
 * amount from this file when it builds the Stripe Checkout Session. Somebody
 * editing localStorage changes what they see, not what they are charged.
 *
 * Plain JS with JSDoc rather than TypeScript so the function can require() it
 * without a build step. One file, imported twice, so the two halves cannot
 * drift apart.
 *
 * Prices are in cents. Weights are in ounces, including box and mailer.
 */

/**
 * @typedef {Object} AddOn
 * @property {string} id
 * @property {string} label
 * @property {string} note        Shown under the label in the configurator.
 * @property {number} priceCents
 * @property {number} weightOz    Added to parcel weight when selected.
 * @property {number} [maxQty]    Defaults to 1. Above 1 the add-on gets a
 *                                stepper instead of a checkbox.
 * @property {boolean} [required] Part of the core spec rather than an option:
 *                                always applied, never shown as a toggle, and
 *                                the buyer cannot check out without filling it.
 *                                Priced at 0 because it is not an upsell.
 * @property {{placeholder: string, maxLength: number}} [input]
 *           Present when the buyer has to type something (a name, a date).
 */

/**
 * @typedef {Object} Product
 * @property {string} slug
 * @property {string} name
 * @property {string} tagline
 * @property {string} description
 * @property {number} priceCents
 * @property {number} weightOz    Piece + box + mailer.
 * @property {string} material
 * @property {string} leadTime
 * @property {string} swatch
 * @property {AddOn[]} addOns
 */

/** @type {AddOn} */
const GIFT_BOX = {
  id: 'gift-box',
  label: 'Gift box and handwritten card',
  note: "Linen-wrapped box, ribbon, and a card in Jenna's hand.",
  priceCents: 600,
  weightOz: 3.5,
  input: { placeholder: 'What should the card say?', maxLength: 120 },
};

/** @type {AddOn} */
const RUSH = {
  id: 'rush',
  label: 'Move to the front of the bench',
  note: 'Ships in 3 business days instead of the usual lead time.',
  priceCents: 1800,
  weightOz: 0,
};

/** @type {Product[]} */
const PRODUCTS = [
  {
    slug: 'name-necklace',
    name: 'Custom Name Necklace',
    tagline: 'Your word, cut by hand',
    description:
      'A single piece of 14k gold fill, pierced and filed by hand into whatever you want it to say. Every letter is cut individually, so no two are identical. Up to twelve characters.',
    priceCents: 6800,
    weightOz: 2.5,
    material: '14k gold fill on a 1.2mm cable chain',
    leadTime: 'Ships in 10 to 14 days',
    swatch: '#B08D57',
    addOns: [
      {
        // What the necklace says is the order, not an extra. It costs nothing
        // and cannot be turned off, but it has to travel with the line all the
        // way to the Stripe metadata or Jenna does not know what to cut.
        id: 'word',
        label: 'Reads',
        note: 'Up to twelve characters, cut as one piece.',
        priceCents: 0,
        weightOz: 0,
        required: true,
        input: { placeholder: 'Jenna', maxLength: 12 },
      },
      {
        id: 'chain-20',
        label: 'Longer chain, 20 inches',
        note: 'Sits below the collarbone. The default is 16 inches.',
        priceCents: 800,
        weightOz: 0.3,
      },
      {
        id: 'engraving',
        label: 'Engraving on the back',
        note: 'A date, initials, or coordinates. Up to 24 characters.',
        priceCents: 1500,
        weightOz: 0,
        input: { placeholder: '10.04.2019', maxLength: 24 },
      },
      {
        id: 'birthstone',
        label: 'Set a birthstone',
        note: 'A 2mm faceted stone, bezel-set beside the last letter.',
        priceCents: 1200,
        weightOz: 0.1,
        input: { placeholder: 'Which month?', maxLength: 20 },
      },
      GIFT_BOX,
      RUSH,
    ],
  },
  {
    slug: 'birthstone-pendant',
    name: 'Birthstone Pendant',
    tagline: 'One stone, or one for everyone',
    description:
      'A brushed disc with bezel-set stones, one per person you want on it. Most people order one per child. The disc grows with the count, so a family of five reads as a row rather than a cluster.',
    priceCents: 5400,
    weightOz: 2.2,
    material: 'Sterling silver, hand-brushed finish',
    leadTime: 'Ships in 7 to 10 days',
    swatch: '#4A7C74',
    addOns: [
      {
        id: 'extra-stone',
        label: 'Additional stone',
        note: 'Each stone after the first. Tell us the months in order.',
        priceCents: 1200,
        weightOz: 0.1,
        maxQty: 8,
        input: { placeholder: 'March, July, November', maxLength: 60 },
      },
      {
        id: 'chain-20',
        label: 'Longer chain, 20 inches',
        note: 'Sits below the collarbone. The default is 18 inches.',
        priceCents: 800,
        weightOz: 0.3,
      },
      {
        id: 'engraving',
        label: 'Engraving on the back',
        note: 'Names, a date, or a short line. Up to 24 characters.',
        priceCents: 1500,
        weightOz: 0,
        input: { placeholder: 'the whole crew', maxLength: 24 },
      },
      GIFT_BOX,
      RUSH,
    ],
  },
];

/**
 * NOTE: the ship-from address is deliberately NOT in this file.
 *
 * This repository is public so GitHub Pages can serve it, and the origin is a
 * private residence. A home address committed here would be indexed, scraped,
 * and permanent in git history. It lives in Secret Manager as ORIGIN_JSON and
 * is read by the Cloud Function only, which is the only half that needs it:
 * the storefront never rates or labels anything.
 *
 * See functions/api/origin.js.
 */

/** Outer dimensions of the shipping box, inches. Same box for every order. */
const PARCEL_DIMS = { length: 6, width: 4, height: 2 };

/**
 * Charged when the live rate lookup fails or is too slow. Never block a sale
 * on a third-party API being down. Set above the zone-8 rate so a fallback
 * quote is never a loss.
 */
const FALLBACK_SHIPPING_CENTS = 895;

/** Order subtotal at or above which shipping is free. Null disables it. */
const FREE_SHIPPING_THRESHOLD_CENTS = 15000;

/** Hard cap on quantity per line, to keep a typo from becoming a real charge. */
const MAX_QTY_PER_LINE = 20;

/** @param {string} slug */
function getProduct(slug) {
  return PRODUCTS.find((p) => p.slug === slug);
}

/**
 * @param {Product} product
 * @param {string} addOnId
 */
function getAddOn(product, addOnId) {
  return product.addOns.find((a) => a.id === addOnId);
}

/** @param {number} cents */
function formatUSD(cents) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

module.exports = {
  PRODUCTS,
  PARCEL_DIMS,
  FALLBACK_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  MAX_QTY_PER_LINE,
  getProduct,
  getAddOn,
  formatUSD,
};
