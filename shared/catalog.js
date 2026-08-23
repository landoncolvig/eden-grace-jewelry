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
 * ── NAMES, DESCRIPTIONS, AND PRICES ARE JENNA'S (2026-08-03) ──
 * From her "Eden Grace Website Edits" doc. Ten pieces since she retired the
 * Chunky Monogram, with The Ellie, The Abigail, The Faith, The Bella, and The
 * Capri added afterward.
 * The names and the wording of what each piece is are hers and should not be
 * "improved".
 *
 * The earlier prices here were mine, scaled from Etsy comps, and carried a
 * standing warning that she had never signed off on them. That is settled:
 * she priced the original five herself and Landon approved them. The Ellie
 * and Abigail prices and copy came directly from Jenna afterward.
 *
 * ── MATERIAL CLAIMS ──
 * `material` is optional and there is no default. A material line is a factual
 * claim to someone about to pay, so it exists only where Jenna wrote one.
 * Nothing here is freshwater pearl. The Rowan used to be described that way
 * and is not. The only pearl claims on the site are the mother of pearl Jenna
 * named in The Blair and The Ellie. Do not reintroduce a pearl claim anywhere
 * without asking her.
 *
 * Color ways and lengths differ per piece; neither is offered on every piece.
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
 * @property {number} [maxPurchaseQuantity]
 *           Maximum number of this piece allowed in one cart. Defaults to
 *           MAX_QTY_PER_LINE and is enforced again by the Cloud Function.
 * @property {string} [material]  Omitted where Jenna asked for no material
 *                                line. The row is not rendered when absent,
 *                                rather than rendered empty. A material claim
 *                                on a page taking money has to be one she
 *                                stands behind, so no default is invented.
 * @property {string} [size]      Fixed finished size, when the piece does not
 *                                offer the length picker.
 * @property {string} leadTime
 * @property {string} swatch
 * @property {string} image       Primary photo, in /public/products.
 * @property {string[]} gallery   Additional photos of the same line.
 * @property {AddOn[]} addOns
 */

/**
 * Color ways, built per piece.
 *
 * These used to be one shared list on every product. They are per piece now
 * because Jenna's 2026-08-03 edits give each strand its own set, which is what
 * you would expect: a color way exists when she has the bead lot for it, and
 * the lots differ piece to piece. Adding a color here without the beads on
 * the bench sells something that cannot be made.
 *
 * The id is `colour`, the odd British spelling left in the codebase, and it
 * stays that way on purpose. It is a key already written into buyers'
 * localStorage carts. Renaming it to match the American spelling used
 * everywhere else would make every saved cart fail its required check and
 * force the buyer to pick again for no gain, since the id is never rendered.
 *
 * That same mechanism is a feature when a color really is retired: a value no
 * longer offered is dropped to empty by pricing.js and then fails the required
 * check, blocking that cart at checkout instead of sending a color Jenna
 * cannot make to the bench.
 *
 * @param {string[]} choices
 * @returns {AddOn}
 */
function colorWays(choices) {
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

/** @type {AddOn} */
const HORSESHOE_CHARM = {
  id: 'horseshoe-charm',
  label: 'Horseshoe charm',
  note: 'Add a gold-tone horseshoe charm.',
  priceCents: 300,
  weightOz: 0,
};

/** @type {AddOn} */
const CLOVER_CHARM = {
  id: 'clover-charm',
  label: '18k gold-plated clover charm',
  note: 'Add an 18k gold-plated clover charm.',
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
    image: 'eden-brown-horseshoe-bust',
    gallery: [
      'eden-brown-horseshoe-detail',
      'eden-brown-bead-detail',
      'eden-navy-bust',
      'eden-navy-bead-detail',
      'eden-navy-bead-detail-alt',
      'eden-brown-horseshoe-flat',
      'eden-navy-flat',
    ],
    addOns: [
      colorWays(['Navy & Cream', 'Brown & Cream']),
      LENGTH,
      TOGGLE_CLASP,
      HORSESHOE_CHARM,
    ],
  },
  {
    slug: 'the-rowan',
    name: 'The Rowan',
    // Was "Pearls, with small spacers". The Rowan is not pearls. Jenna's
    // 2026-08-03 description calls it white beads with colorful spacers and
    // took the material line off entirely, so the tagline echoes her wording
    // and claims nothing about what the beads are made of.
    tagline: 'White beads, colorful spacers',
    description: 'White beads with colorful spacer beads',
    priceCents: 4000,
    weightOz: 2.2,
    size: '16 inches',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#B08D57',
    image: 'rowan-green-bust',
    gallery: [
      'rowan-green-bust-detail',
      'rowan-blue-bust',
      'rowan-blue-bust-detail',
      'rowan-ivory-bust',
      'rowan-ivory-bust-detail',
      'rowan-green-flat',
      'rowan-ivory-flat',
      'rowan-blue-flat',
      'rowan-colorways-detail',
    ],
    addOns: [
      colorWays(['Royal Blue', 'Brown', 'Yellow', 'Green', 'Pink']),
      TOGGLE_CLASP,
    ],
  },
  {
    slug: 'the-emmy',
    name: 'The Emmy',
    tagline: 'Our delicate style',
    description:
      'Our 16 inch delicate style necklace. Small dainty beads with color of your choice.',
    priceCents: 4500,
    weightOz: 2.0,
    material: 'Small gemstone beads on gold-tone findings',
    size: '16 inches',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#7FA9C4',
    image: 'emmy-green-bust',
    gallery: [
      'emmy-green-bead-detail',
      'emmy-green-flat',
      'emmy-neutral-purple-clover-detail',
      'emmy-neutral-purple-flat',
      'emmy-neutral-purple-bead-detail',
      'emmy-neutral-purple-clover-side',
      'emmy-neutral-purple-bust',
      'emmy-green-transition-detail',
      'emmy-green-strand-detail',
    ],
    addOns: [colorWays(['Green', 'Neutral Purple']), CLOVER_CHARM],
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
    // Replaced blair-mint-pearl on 2026-08-03. That strand had two green beads
    // adjacent at the bottom, breaking the alternating run. This is the shot
    // Jenna texted, cut out of the wood board she photographed it on.
    image: 'blair-aventurine-pearl',
    gallery: [],
    // One fixed 18 inch strand in one color way, so neither picker applies.
    // The description carries the length instead.
    addOns: [TOGGLE_CLASP],
  },
  {
    slug: 'the-ellie',
    name: 'The Ellie',
    tagline: 'Mother of pearl with 14k gold charms',
    description: 'Our 18 inch beaded necklace with mother of pearl and 14k gold charms.',
    priceCents: 5000,
    weightOz: 4,
    material: 'mother of pearl and 14k gold',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#C8D5E8',
    image: 'ellie-translucent-white-bust',
    gallery: [
      'ellie-neutral-pink-bust',
      'ellie-pearl-gold',
      'ellie-translucent-white-flat',
      'ellie-neutral-pink-flat',
      'ellie-gold-detail',
      'ellie-mother-of-pearl-detail',
      'ellie-translucent-white-green-detail',
      'ellie-neutral-pink-green-detail',
      'ellie-translucent-white-bust-detail',
      'ellie-translucent-white-side-detail',
      'ellie-translucent-white-pearl-detail',
      'ellie-neutral-pink-bust-detail',
      'ellie-neutral-pink-side-detail',
      'ellie-neutral-pink-pearl-detail',
    ],
    // One fixed 18 inch strand. The description carries the length.
    addOns: [colorWays(['Purple', 'Neutral Pink', 'Translucent White'])],
  },
  {
    slug: 'the-abigail',
    name: 'The Abigail',
    tagline: 'Natural aventurine with a gold shell charm',
    description:
      'A 16 inch necklace made with natural aventurine and mother of pearl, finished with a gold shell charm.',
    priceCents: 4800,
    weightOz: 2.2,
    maxPurchaseQuantity: 5,
    material: 'natural aventurine and mother of pearl with a gold shell charm',
    size: '16 inches',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#5F8B69',
    image: 'abigail-aventurine-shell-bust',
    gallery: [
      'abigail-aventurine-shell-detail',
      'abigail-shell-charm-macro',
      'abigail-aventurine-clasp-flat',
      'abigail-aventurine-shell-flat',
    ],
    // One fixed 16 inch strand. The size is shown in the product details.
    addOns: [TOGGLE_CLASP],
  },
  {
    slug: 'the-faith',
    name: 'The Faith',
    tagline: 'Soft multicolor beads with a cross charm',
    description: 'A 16 inch beaded necklace finished with a gold-tone cross charm.',
    priceCents: 4500,
    weightOz: 2.2,
    size: '16 inches',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#A9B6A1',
    image: 'faith-cross-bust',
    gallery: [
      'faith-cross-doubled',
      'faith-cross-charm-detail',
      'faith-cross-bead-detail',
      'faith-cross-toggle-detail',
    ],
    // No material line until Jenna identifies the beads. One fixed 16 inch
    // strand with the same optional $3 toggle clasp as the other necklaces.
    addOns: [TOGGLE_CLASP],
  },
  {
    slug: 'the-bella',
    name: 'The Bella',
    tagline: 'Afghan serpentine with gold-tone accents',
    description:
      'A softly colored beaded necklace made with Afghan serpentine and gold-tone accents.',
    priceCents: 4000,
    weightOz: 2.2,
    material: 'Afghan serpentine',
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#B6BE8E',
    image: 'bella-serpentine-bust',
    gallery: [
      'bella-serpentine-toggle-flat',
      'bella-serpentine-clasp-detail',
      'bella-serpentine-bead-detail',
    ],
    // Jenna did not provide a finished length, so the product page does not
    // claim one. It has the same optional $3 toggle clasp as the other pieces.
    addOns: [TOGGLE_CLASP],
  },
  {
    slug: 'the-capri',
    name: 'The Capri',
    tagline: 'Colorful beads with a fish centerpiece',
    description:
      'A colorful beaded necklace with a fish centerpiece, available in blue or pink.',
    priceCents: 4000,
    weightOz: 2.2,
    leadTime: 'Ships in 5 to 7 days',
    swatch: '#4D9BB7',
    image: 'capri-blue-bust',
    gallery: [
      'capri-blue-fish-detail',
      'capri-blue-doubled-flat',
      'capri-blue-flat',
      'capri-blue-bead-detail',
      'capri-pink-bust',
      'capri-pink-fish-detail',
      'capri-pink-flat',
      'capri-pink-fish-macro',
    ],
    // Jenna did not provide a finished length or material, so neither is
    // claimed on the product page. The buyer must choose Blue or Pink.
    addOns: [colorWays(['Blue', 'Pink'])],
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
      colorWays(['Light Blue', 'Pink', 'Purple', 'Yellow', 'Dark Blue']),
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
 * Product-specific cart limit, capped again by the global typo guard.
 *
 * @param {Product} product
 */
function getMaxPurchaseQuantity(product) {
  const declared = Number(product.maxPurchaseQuantity ?? MAX_QTY_PER_LINE);
  if (!Number.isFinite(declared)) return MAX_QTY_PER_LINE;
  return Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.floor(declared)));
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
  getMaxPurchaseQuantity,
  getAddOn,
  formatUSD,
};
