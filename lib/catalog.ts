/**
 * The catalog is the single source of truth for prices and weights.
 *
 * Nothing here is ever taken from the browser. The cart sends item ids and
 * add-on ids; the server looks the prices up in this file when it builds the
 * Stripe Checkout Session. A customer editing localStorage changes what they
 * see, not what they are charged.
 *
 * Prices are in cents. Weights are in ounces, including packaging.
 */

export type AddOn = {
  id: string;
  label: string;
  /** Shown under the label in the configurator. */
  note: string;
  priceCents: number;
  /** Added to the parcel weight when selected. */
  weightOz: number;
  /** Add-ons that require the buyer to type something (a name, a date). */
  input?: { placeholder: string; maxLength: number };
};

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  /** Base parcel weight in ounces: piece + box + mailer. */
  weightOz: number;
  material: string;
  leadTime: string;
  /** Rendered behind the script name on the product card. */
  swatch: string;
  addOns: AddOn[];
};

const GIFT_BOX: AddOn = {
  id: "gift-box",
  label: 'Gift box and handwritten card',
  note: "Linen-wrapped box, ribbon, and a card in Jenna's hand.",
  priceCents: 600,
  weightOz: 3.5,
  input: { placeholder: "What should the card say?", maxLength: 120 },
};

const RUSH: AddOn = {
  id: "rush",
  label: "Move to the front of the bench",
  note: "Ships in 3 business days instead of the usual lead time.",
  priceCents: 1800,
  weightOz: 0,
};

export const PRODUCTS: Product[] = [
  {
    slug: "name-necklace",
    name: "Custom Name Necklace",
    tagline: "Your word, cut by hand",
    description:
      "A single piece of 14k gold fill, pierced and filed by hand into whatever you want it to say. Every letter is cut individually, so no two are identical. Up to twelve characters.",
    priceCents: 6800,
    weightOz: 2.5,
    material: "14k gold fill on a 1.2mm cable chain",
    leadTime: "Ships in 10-14 days",
    swatch: "#B08D57",
    addOns: [
      {
        id: "chain-20",
        label: 'Longer chain, 20 inches',
        note: "Sits below the collarbone. The default is 16 inches.",
        priceCents: 800,
        weightOz: 0.3,
      },
      {
        id: "engraving",
        label: "Engraving on the back",
        note: "A date, initials, or coordinates. Up to 24 characters.",
        priceCents: 1500,
        weightOz: 0,
        input: { placeholder: "10.04.2019", maxLength: 24 },
      },
      {
        id: "birthstone",
        label: "Set a birthstone",
        note: "A 2mm faceted stone, bezel-set beside the last letter.",
        priceCents: 1200,
        weightOz: 0.1,
        input: { placeholder: "Which month?", maxLength: 20 },
      },
      GIFT_BOX,
      RUSH,
    ],
  },
  {
    slug: "birthstone-pendant",
    name: "Birthstone Pendant",
    tagline: "One stone, or one for everyone",
    description:
      "A brushed disc with bezel-set stones, one per person you want on it. Most people order one per child. The disc grows with the count, so a family of five reads as a row rather than a cluster.",
    priceCents: 5400,
    weightOz: 2.2,
    material: "Sterling silver, hand-brushed finish",
    leadTime: "Ships in 7-10 days",
    swatch: "#4A7C74",
    addOns: [
      {
        id: "extra-stone",
        label: "Additional stone",
        note: "Each stone after the first. Tell us the months in order.",
        priceCents: 1200,
        weightOz: 0.1,
        input: { placeholder: "March, July, November", maxLength: 60 },
      },
      {
        id: "chain-20",
        label: "Longer chain, 20 inches",
        note: "Sits below the collarbone. The default is 18 inches.",
        priceCents: 800,
        weightOz: 0.3,
      },
      {
        id: "engraving",
        label: "Engraving on the back",
        note: "Names, a date, or a short line. Up to 24 characters.",
        priceCents: 1500,
        weightOz: 0,
        input: { placeholder: "the whole crew", maxLength: 24 },
      },
      GIFT_BOX,
      RUSH,
    ],
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getAddOn(product: Product, addOnId: string): AddOn | undefined {
  return product.addOns.find((a) => a.id === addOnId);
}

export function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
