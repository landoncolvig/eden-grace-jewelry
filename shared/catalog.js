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
 *
 * PRICING BASIS (2026-07-26, provisional until Jenna signs off): set from live
 * Etsy listings filtered to sellers with real review volume, not from listing
 * averages, which are dragged down by imported strands. Gemstone $48 sits on
 * the $42-55 high-review median for gold-tone hardware. Pearl $58 reflects the
 * ~$13 premium genuine freshwater carries in every channel measured, while
 * staying under the $65-91 cluster that is all 14k gold-filled. Name necklace
 * $42 clears the crowded $22-25 median on made-to-order, and her letters are
 * mother-of-pearl rather than acrylic, which is what supports the top of that
 * band.
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
 * @property {string} image       Primary photo, in /public/products.
 * @property {string[]} gallery   Additional photos of the same line.
 * @property {AddOn[]} addOns
 */

/**
 * Shared options.
 *
 * Two things are deliberately absent, both from market research into
 * comparable shops:
 *
 *   Length upcharge. Nobody in this price tier charges for a longer strand.
 *   Every comparable listing checked priced all lengths the same, and it costs
 *   pennies of wire. Length is a free choice below, and the extender covers
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

/** @type {Product[]} */
const PRODUCTS = [
  {
    slug: 'gemstone-strand',
    name: 'Gemstone Strand',
    tagline: 'One stone, strung end to end',
    description:
      'Round gemstone beads strung by hand on nylon-coated steel wire, finished with a gold-tone lobster clasp. The stones are natural, so colour shifts bead to bead and no two strands come out the same.',
    priceCents: 4800,
    weightOz: 2.4,
    material: 'Natural gemstone on gold-tone findings',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#4A7C74',
    image: 'aventurine-1',
    gallery: ['aventurine-2', 'aventurine-3', 'amazonite', 'coral-1', 'turquoise-heishi'],
    addOns: [
      {
        id: 'stone',
        label: 'Stone',
        note: 'Which stone should it be?',
        priceCents: 0,
        weightOz: 0,
        required: true,
        choices: [
          'Green aventurine',
          'Black onyx',
          'Pink rhodonite',
          'Amazonite',
          'Turquoise heishi',
        ],
      },
      LENGTH,
      ACCENTS,
      EXTENDER,
      GIFT_WRAP,
    ],
  },
  {
    slug: 'pearl-strand',
    name: 'Freshwater Pearl Strand',
    tagline: 'Real pearls, nothing else',
    description:
      'Genuine cultured freshwater pearls, small and slightly irregular the way real ones are, on a gold-tone clasp. Wears with everything and does not read as costume.',
    priceCents: 5800,
    weightOz: 2.2,
    material: 'Cultured freshwater pearl on gold-tone findings',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#B08D57',
    image: 'pearl-cream',
    gallery: ['pearl-butter', 'gold-strand', 'hematite-gold'],
    addOns: [LENGTH, EXTENDER, GIFT_WRAP],
  },
  {
    slug: 'name-necklace',
    name: 'Name Necklace',
    tagline: 'Your word, spelled in mother of pearl',
    description:
      'A beaded strand with mother-of-pearl letter discs set into the front. Up to ten characters. Most people order a name, a set of initials, or a birth year.',
    priceCents: 4200,
    weightOz: 2.3,
    material: 'Mother-of-pearl letters on a glass or gemstone strand',
    leadTime: 'Ships in 7 to 10 days',
    swatch: '#7FA9C4',
    image: 'letter-necklace',
    gallery: ['amazonite', 'onyx-pearl-1'],
    addOns: [
      {
        // What the necklace says is the order, not an extra. It costs nothing
        // and cannot be turned off, but it has to travel with the line all the
        // way to the Stripe metadata or Jenna does not know what to string.
        id: 'word',
        label: 'Reads',
        note: 'What should it say?',
        priceCents: 0,
        weightOz: 0,
        required: true,
        input: { placeholder: 'MAV', maxLength: 10 },
      },
      {
        id: 'base',
        label: 'Strand colour',
        note: 'The beads either side of the letters.',
        priceCents: 0,
        weightOz: 0,
        required: true,
        choices: ['Pale blue', 'Cream', 'Black onyx', 'Green aventurine'],
      },
      LENGTH,
      ACCENTS,
      EXTENDER,
      GIFT_WRAP,
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
