/**
 * Turns an untrusted cart from the browser into priced line items.
 *
 * The browser runs this to show a total. The Cloud Function runs the exact
 * same code to decide what to charge. Because both sides derive every amount
 * from shared/catalog.js and neither reads a price off the request body, the
 * displayed total and the charged total cannot drift, and a tampered cart is
 * simply re-priced rather than trusted.
 *
 * Everything here treats its input as hostile: unknown slugs, unknown add-on
 * ids, non-integer quantities, absurd quantities, and oversized free-text all
 * get dropped or clamped rather than throwing.
 */

const {
  getProduct,
  getAddOn,
  MAX_QTY_PER_LINE,
  FREE_SHIPPING_THRESHOLD_CENTS,
} = require('./catalog.js');

/**
 * @typedef {Object} CartAddOnInput
 * @property {string} id
 * @property {number} [qty]
 * @property {string} [value]   Free text the buyer typed, if the add-on takes it.
 */

/**
 * @typedef {Object} CartLineInput
 * @property {string} slug
 * @property {number} qty
 * @property {CartAddOnInput[]} [addOns]
 */

/** Clamp to a whole number inside [min, max]; anything unparseable becomes min. */
function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/** Trim free text to the add-on's declared limit and strip control characters. */
function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

/**
 * Re-price a cart against the catalog.
 *
 * @param {CartLineInput[]} rawLines
 * @returns {{
 *   lines: Array<{
 *     slug: string, name: string, qty: number,
 *     unitCents: number, lineCents: number, weightOz: number,
 *     addOns: Array<{id: string, label: string, qty: number, value: string, priceCents: number}>,
 *     description: string
 *   }>,
 *   subtotalCents: number,
 *   totalWeightOz: number,
 *   dropped: string[]
 * }}
 */
function priceCart(rawLines) {
  const lines = [];
  const dropped = [];
  const missingRequired = [];

  if (!Array.isArray(rawLines)) {
    return {
      lines: [],
      subtotalCents: 0,
      totalWeightOz: 0,
      dropped: ['cart was not a list'],
      missingRequired: [],
    };
  }

  for (const raw of rawLines.slice(0, 50)) {
    const product = raw && typeof raw.slug === 'string' ? getProduct(raw.slug) : undefined;
    if (!product) {
      dropped.push(`unknown item: ${String(raw && raw.slug)}`);
      continue;
    }

    const qty = clampInt(raw.qty, 1, MAX_QTY_PER_LINE);

    // Resolve add-ons against the product's own list, so an add-on belonging to
    // a different product cannot be attached to this one.
    const resolvedAddOns = [];
    const seen = new Set();
    const rawAddOns = Array.isArray(raw.addOns) ? raw.addOns.slice(0, 20) : [];

    for (const rawAddOn of rawAddOns) {
      if (!rawAddOn || typeof rawAddOn.id !== 'string') continue;
      if (seen.has(rawAddOn.id)) continue;

      const addOn = getAddOn(product, rawAddOn.id);
      if (!addOn) {
        dropped.push(`unknown add-on for ${product.slug}: ${rawAddOn.id}`);
        continue;
      }
      seen.add(addOn.id);

      const addOnQty = clampInt(rawAddOn.qty ?? 1, 1, addOn.maxQty ?? 1);

      let value = '';
      if (addOn.choices) {
        // A picker's value has to be one Jenna can actually make. Anything
        // else is dropped to empty, which makes a required picker fail the
        // missingRequired check below rather than reaching the bench as a
        // stone that does not exist.
        const submitted = sanitizeText(rawAddOn.value, 60);
        const match = addOn.choices.find(
          (c) => c.toLowerCase() === submitted.toLowerCase(),
        );
        if (submitted && !match) {
          dropped.push(`invalid ${addOn.id} for ${product.slug}: ${submitted}`);
        }
        value = match || '';
      } else if (addOn.input) {
        value = sanitizeText(rawAddOn.value, addOn.input.maxLength);
      }

      resolvedAddOns.push({
        id: addOn.id,
        label: addOn.label,
        qty: addOnQty,
        value,
        priceCents: addOn.priceCents * addOnQty,
        weightOz: addOn.weightOz * addOnQty,
        required: Boolean(addOn.required),
        choices: addOn.choices,
      });
    }

    // A required spec with no value means there is nothing to make. The client
    // blocks this in the UI, but the server has to be the one that refuses,
    // since the UI is not the thing being trusted.
    for (const required of product.addOns.filter((a) => a.required)) {
      const supplied = resolvedAddOns.find((a) => a.id === required.id);
      if (!supplied || supplied.value.trim().length === 0) {
        missingRequired.push(`${product.name}: ${required.label.toLowerCase()} is blank`);
      }
    }

    const addOnCents = resolvedAddOns.reduce((sum, a) => sum + a.priceCents, 0);
    const addOnWeight = resolvedAddOns.reduce((sum, a) => sum + a.weightOz, 0);

    const unitCents = product.priceCents + addOnCents;

    lines.push({
      slug: product.slug,
      name: product.name,
      qty,
      unitCents,
      lineCents: unitCents * qty,
      weightOz: (product.weightOz + addOnWeight) * qty,
      addOns: resolvedAddOns.map(({ id, label, qty: q, value, priceCents, required }) => ({
        id,
        label,
        qty: q,
        value,
        priceCents,
        required,
      })),
      description: describeLine(product, resolvedAddOns),
    });
  }

  return {
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.lineCents, 0),
    totalWeightOz: lines.reduce((sum, l) => sum + l.weightOz, 0),
    dropped,
    missingRequired,
  };
}

/**
 * One-line spec of what was actually ordered. This is what Jenna reads off the
 * order to know what to make, so it has to carry the typed values, not just
 * the add-on names.
 */
function describeLine(product, resolvedAddOns) {
  if (resolvedAddOns.length === 0) return product.material;

  // Required specs first: the word a necklace reads is the headline of the
  // work order, not one option among five.
  const ordered = [...resolvedAddOns].sort(
    (a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)),
  );

  const parts = ordered.map((a) => {
    const qtyPrefix = a.qty > 1 ? `${a.qty} x ` : '';
    return a.value ? `${qtyPrefix}${a.label}: ${a.value}` : `${qtyPrefix}${a.label}`;
  });

  return parts.join(' / ');
}

/**
 * Shipping is free above the threshold. Returns the charged amount and a
 * reason, so the UI can say why it is zero instead of looking broken.
 *
 * @param {number} subtotalCents
 * @param {number} quotedCents
 */
function applyShippingRules(subtotalCents, quotedCents) {
  if (
    FREE_SHIPPING_THRESHOLD_CENTS !== null &&
    subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
  ) {
    return { chargedCents: 0, free: true, quotedCents };
  }
  return { chargedCents: quotedCents, free: false, quotedCents };
}

module.exports = { priceCart, applyShippingRules, clampInt, sanitizeText };
