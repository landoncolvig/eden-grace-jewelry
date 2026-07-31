/**
 * The catalog is the single source of truth for prices and weights.
 *
 * Both the storefront and the Cloud Function import this file. The storefront
 * uses it to render; the function uses it to price. That matters: the browser
 * only ever sends item ids and add-on ids, and the function re-derives every
 * amount from this file when it builds the Square payment link. Somebody
 * editing localStorage changes what they see, not what they are charged.
 *
 * Plain JS with JSDoc rather than TypeScript so the function can require() it
 * without a build step. One file, imported twice, so the two halves cannot
 * drift apart.
 *
 * Prices are in cents. Weights are in ounces, including box and mailer.
 *
 * ── NAMES AND DESCRIPTIONS ARE JENNA'S, VERBATIM (2026-07-31) ──
 * She updated the six-piece line in her "Necklace names" note. The names and the wording of what each
 * piece is are hers and should not be "improved". Every one of them offers
 * color and length of the buyer's choice, which is why those are required
 * pickers on all six rather than an option on one.
 *
 * ── PRICES ARE PROVISIONAL ──
 * She named the pieces; she did not price them. These are scaled from live
 * Etsy comps (high-review sellers, gold-tone hardware) by how much material
 * each piece actually uses: dainty < original < chunky, with pearl carrying
 * the premium it carries in every channel measured, and the monograms above
 * their plain equivalents because they are made to order and mother-of-pearl
 * letters cost more than beads. Every one needs her sign-off before this
 * shop takes real money at these numbers.
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
 * @property {string[]} [choices] When present the value must be one of these,
 *                                enforced server-side. Renders as a picker.
 * @property {{placeholder: string, maxLength: number}} [input]
 *           Present when the buyer has to type something.
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
 * @property {string} image       Primary photo, in /public/products.
 * @property {string[]} gallery   Additional photos of the same line.
 * @property {AddOn[]} addOns
 */

/**
 * Colour, offered on every piece because Jenna offers it on every piece.
 *
 * The list is the stones and glass she actually strings, taken from her own
 * photographs. Adding a colour here without adding the beads to the bench
 * sells something that cannot be made.
 */
const COLOUR = {
  id: 'colour',
  label: 'Color',
  note: 'Which color should it be?',
  priceCents: 0,
  weightOz: 0,
  required: true,
  choices: [
    'Green aventurine',
    'Black onyx',
    'Pink rhodonite',
    'Amazonite',
    'Cream and ivory',
    'Turquoise',
    'Gold and hematite',
  ],
};

/** @type {AddOn} */
const LENGTH = {
  id: 'length',
  label: 'Length',
  note: 'Pick a length. They all cost the same.',
  priceCents: 0,
  weightOz: 0,
  required: true,
  choices: ['16 inches', '18 inches', '20 inches'],
};

/** @type {AddOn} */
const TOGGLE_CLASP = {
  id: 'toggle-clasp',
  label: 'Toggle clasp',
  note: 'A toggle clasp instead of the regular clasp.',
  priceCents: 300,
  weightOz: 0,
};

/**
 * Shared options.
 *
 * Two things are deliberately absent, both from market research into
 * comparable shops:
 *
 *   Length upcharge. Nobody in this price tier charges for a longer strand.
 *   Every comparable listing checked priced all lengths the same, and it costs
 *   pennies of wire. Length is a free choice above, and the extender covers
 *   anyone who wants to adjust after the fact.
 *
 *   Rush processing. No comparable shop sells queue priority as a line item,
 *   and several state outright that paying more does not move an order up.
 *   Selling it would be a promise that is hard for one person to keep.
 *
 * @type {AddOn}
 */
const ACCENTS = {
  id: 'accents',
  label: 'Pearl and gold accent beads',
  note: 'Freshwater pearls and gold-tone rounds spaced through the strand.',
  priceCents: 800,
  weightOz: 0.2,
};

/** @type {AddOn} */
const EXTENDER = {
  id: 'extender',
  label: 'Add a 2 inch extender',
  note: 'A short chain at the clasp, so one necklace sits at two lengths.',
  priceCents: 600,
  weightOz: 0.2,
};

/** @type {AddOn} */
const GIFT_WRAP = {
  id: 'gift-wrap',
  label: 'Gift wrap and a handwritten card',
  note: "Kraft box, ribbon, and a card in Jenna's hand.",
  priceCents: 500,
  weightOz: 2.5,
  input: { placeholder: 'What should the card say?', maxLength: 120 },
};

/**
 * The monogram itself.
 *
 * Capped at three characters, because a monogram is initials. The earlier
 * build allowed ten, which is a name necklace and a different product; Jenna
 * named these "Monogram" specifically.
 *
 * @type {AddOn}
 */
const MONOGRAM = {
  id: 'monogram',
  label: 'Monogram',
  note: 'Which initials?',
  priceCents: 0,
  weightOz: 0,
  required: true,
  input: { placeholder: 'EGC', maxLength: 3 },
};

/** @type {Product[]} */
const PRODUCTS = [
  {
    slug: 'the-eden',
    name: 'The Eden',
    tagline: 'Our original style',
    description:
      'Our original style necklace. Has small and medium sized beads spaced out with small spacers. Color and length of your choice.',
    priceCents: 4800,
    weightOz: 2.4,
    material: 'Natural gemstone on gold-tone findings',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#4A7C74',
    image: 'eden-pearl-black',
    gallery: [
      'eden-onyx-ivory-toggle',
      'aventurine-1',
      'aventurine-2',
      'aventurine-3',
      'coral-1',
      'onyx-pearl-1',
    ],
    addOns: [COLOUR, LENGTH, TOGGLE_CLASP, ACCENTS, EXTENDER, GIFT_WRAP],
  },
  {
    slug: 'the-rowan',
    name: 'The Rowan',
    tagline: 'Pearls, with small spacers',
    description:
      'Pearl beaded necklace with small spacers. Color and length of your choice.',
    priceCents: 5800,
    weightOz: 2.2,
    material: 'Cultured freshwater pearl on gold-tone findings',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#B08D57',
    image: 'rowan-ivory',
    gallery: [
      'rowan-green-ivory-front',
      'rowan-green-ivory-angle',
      'pearl-cream',
      'pearl-butter',
      'aventurine-pearl',
    ],
    addOns: [COLOUR, LENGTH, TOGGLE_CLASP, EXTENDER, GIFT_WRAP],
  },
  {
    slug: 'the-emmy',
    name: 'The Emmy',
    tagline: 'Our delicate style',
    description:
      'Our delicate style necklace. Small dainty beads with color and length of your choice.',
    priceCents: 4200,
    weightOz: 2.0,
    material: 'Small gemstone beads on gold-tone findings',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#7FA9C4',
    image: 'emmy-jewel-tone',
    gallery: ['amazonite', 'onyx-pearl-2', 'gold-strand'],
    addOns: [COLOUR, LENGTH, TOGGLE_CLASP, ACCENTS, EXTENDER, GIFT_WRAP],
  },
  {
    slug: 'the-blair',
    name: 'The Blair',
    tagline: 'Chunky beads with a statement',
    description:
      'Our chunky beaded necklace. Chunky beads with a statement. Color and length of your choice.',
    priceCents: 5600,
    weightOz: 3.2,
    material: 'Chunky gemstone and heishi on gold-tone findings',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#3AA6A8',
    image: 'blair-mint-pearl',
    gallery: ['turquoise-heishi', 'coral-2', 'hematite-gold'],
    addOns: [COLOUR, LENGTH, TOGGLE_CLASP, EXTENDER, GIFT_WRAP],
  },
  {
    slug: 'the-delicate-monogram',
    name: 'The Delicate Monogram',
    tagline: 'Initials on a dainty strand',
    description:
      'Our monogram necklace with the color and length of your choice.',
    priceCents: 4600,
    weightOz: 2.1,
    material: 'Mother-of-pearl letters on small gemstone beads',
    leadTime: 'Ships in 7 to 10 days',
    swatch: '#9BB7C9',
    image: 'delicate-monogram-aqua',
    gallery: ['amazonite', 'onyx-pearl-2'],
    addOns: [MONOGRAM, COLOUR, LENGTH, TOGGLE_CLASP, EXTENDER, GIFT_WRAP],
  },
  {
    slug: 'the-chunky-monogram',
    name: 'The Chunky Monogram',
    tagline: 'Initials, with more presence',
    description:
      'Our monogram necklace with the color and length of your choice.',
    priceCents: 5200,
    weightOz: 3.0,
    material: 'Mother-of-pearl letters on chunky gemstone beads',
    leadTime: 'Ships in 7 to 10 days',
    swatch: '#2E8F91',
    // Jenna's 2026-07-31 note did not include a Chunky Monogram photo, so this
    // keeps the chunky strand reference until she supplies one.
    image: 'turquoise-heishi',
    gallery: ['coral-2'],
    addOns: [MONOGRAM, COLOUR, LENGTH, TOGGLE_CLASP, EXTENDER, GIFT_WRAP],
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
const FALLBACK_SHIPPING_CENTS = 795;

/**
 * Free shipping threshold.
 *
 * $75 rather than Etsy's familiar $35: that number is a marketplace
 * convention, and the median across independent maker sites is around $100.
 * At a ~$50 average order, $75 is the level that pushes a second piece into
 * the cart without giving away postage on every single sale.
 */
const FREE_SHIPPING_THRESHOLD_CENTS = 7500;

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
