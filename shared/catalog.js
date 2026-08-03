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
 * @property {string} [material]  Omitted where Jenna asked for no material
 *                                line. The row is not rendered when absent,
 *                                rather than rendered empty. A material claim
 *                                on a page taking money has to be one she
 *                                stands behind, so no default is invented.
 * @property {string} leadTime
 * @property {string} swatch
 * @property {string} image       Primary photo, in /public/products.
 * @property {string[]} gallery   Additional photos of the same line.
 * @property {AddOn[]} addOns
 */

/**
 * Colour ways, built per piece.
 *
 * These used to be one shared list on every product. They are per piece now
 * because Jenna's 2026-08-03 edits give each strand its own set, which is what
 * you would expect: a colour way exists when she has the bead lot for it, and
 * the lots differ piece to piece. Adding a colour here without the beads on
 * the bench sells something that cannot be made.
 *
 * The id stays `colour` across all of them so an older cart still resolves to
 * the right add-on. A value that is no longer offered is dropped to empty by
 * pricing.js and then fails the required check, which blocks that cart at
 * checkout instead of sending a retired colour to the bench.
 *
 * @param {string[]} choices
 * @returns {AddOn}
 */
function colourWays(choices) {
  return {
    id: 'colour',
    label: 'Color Ways',
    note: 'Which color way should it be?',
    priceCents: 0,
    weightOz: 0,
    required: true,
    choices,
  };
}

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
 * Options that are deliberately absent, and why.
 *
 *   Length upcharge. Nobody in this price tier charges for a longer strand.
 *   Every comparable listing checked priced all lengths the same, and it costs
 *   pennies of wire. Length is a free choice where it is offered at all.
 *
 *   Rush processing. No comparable shop sells queue priority as a line item,
 *   and several state outright that paying more does not move an order up.
 *   Selling it would be a promise that is hard for one person to keep.
 *
 *   Gift wrap and a handwritten card. Removed 2026-07-31. It was $5 for a
 *   kraft box, ribbon, and a card carrying a message the buyer typed into a
 *   120 character field. Every one of those is a per-order task that only
 *   Jenna can do, and transcribing someone else's words by hand is the kind
 *   of thing that goes wrong quietly on the order that mattered most.
 *
 *   Pearl and gold accent beads. Removed 2026-08-03 at Jenna's request. It was
 *   $8 to space freshwater pearls and gold-tone rounds through the strand, and
 *   it was offered on The Eden and The Emmy. She asked for it off both, which
 *   left nothing using it.
 */

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
  // Jenna asked for the buyer to set the letters "and in the order they want".
  // A three character free-text field already does that, since what they type
  // is strung left to right. The note says so rather than leaving them to
  // assume the letters get reordered into some standard monogram form.
  note: 'Which initials, in the order you want them strung?',
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
    gallery: ['eden-onyx-ivory-toggle'],
    addOns: [colourWays(['Navy & Cream', 'Brown & Cream']), LENGTH, TOGGLE_CLASP],
  },
  {
    slug: 'the-rowan',
    name: 'The Rowan',
    tagline: 'Pearls, with small spacers',
    description: 'White beads with colorful spacer beads',
    priceCents: 4000,
    weightOz: 2.2,
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#B08D57',
    image: 'rowan-ivory',
    gallery: ['rowan-green-ivory-front', 'rowan-green-ivory-angle'],
    addOns: [
      colourWays(['Royal Blue', 'Brown', 'Yellow', 'Green', 'Pink']),
      LENGTH,
      TOGGLE_CLASP,
    ],
  },
  {
    slug: 'the-emmy',
    name: 'The Emmy',
    tagline: 'Our delicate style',
    description:
      'Our delicate style necklace. Small dainty beads with color and length of your choice.',
    priceCents: 4500,
    weightOz: 2.0,
    material: 'Small gemstone beads on gold-tone findings',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#7FA9C4',
    image: 'emmy-jewel-tone',
    gallery: [],
    addOns: [
      colourWays(['Green & Gold', 'Navy Blue & Purple', 'Light Pink', 'Brown & Cream']),
      LENGTH,
      TOGGLE_CLASP,
    ],
  },
  {
    slug: 'the-blair',
    name: 'The Blair',
    tagline: 'Chunky beads with a statement',
    description:
      'Our 18 inch chunky beaded necklace made with natural aventurine and mother of pearl.',
    priceCents: 7800,
    weightOz: 3.2,
    material: 'natural aventurine and mother of pearl',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#3AA6A8',
    image: 'blair-mint-pearl',
    gallery: [],
    // One fixed 18 inch strand in one colour way, so neither picker applies.
    // The description carries the length instead.
    addOns: [TOGGLE_CLASP],
  },
  {
    slug: 'the-delicate-monogram',
    name: 'The Delicate Monogram',
    tagline: 'Initials on a dainty strand',
    description:
      '16 inch necklace with dainty gemstones. Add up to 3 monogram letters.',
    priceCents: 3500,
    weightOz: 2.1,
    leadTime: 'Ships in 7 to 10 days',
    swatch: '#9BB7C9',
    image: 'delicate-monogram-aqua',
    gallery: [],
    // Fixed at 16 inches, which the description states, so no length picker.
    addOns: [
      MONOGRAM,
      colourWays(['Light Blue', 'Pink', 'Purple', 'Yellow', 'Dark Blue']),
      TOGGLE_CLASP,
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
