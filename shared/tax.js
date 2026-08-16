/**
 * Texas sales tax for direct Eden Grace storefront orders.
 *
 * Eden Grace operates and fulfills orders from Bedford, Texas. Bedford's
 * combined state and local rate is 8.25%. Texas also treats delivery charges
 * connected to taxable merchandise as taxable, so the shipping charge is part
 * of the tax base.
 *
 * Etsy is intentionally outside this module: Etsy is a marketplace provider
 * and collects its own tax. This is only for the direct Square checkout.
 */

const TEXAS_SALES_TAX_RATE_PERCENT = '8.25';
const TEXAS_SALES_TAX_RATE_BPS = 825;

/**
 * Texas ZIP prefixes are 733, 750-799, and 885. The storefront only ships in
 * the US and collects a five-digit ZIP before it creates the Square checkout,
 * so this is enough to decide whether Texas tax applies without collecting a
 * private street address in the browser.
 */
function isTexasZip(value) {
  const zip = String(value || '').trim();
  if (!/^\d{5}$/.test(zip)) return false;
  const prefix = Number(zip.slice(0, 3));
  return prefix === 733 || (prefix >= 750 && prefix <= 799) || prefix === 885;
}

/**
 * Texas rounds sales tax to the nearest cent. All inputs and output are cents,
 * avoiding floating-point dollar arithmetic.
 */
function calculateTexasSalesTaxCents(subtotalCents, shippingCents, zip) {
  if (!isTexasZip(zip)) return 0;
  const taxableCents = Math.max(0, Math.round(Number(subtotalCents) || 0))
    + Math.max(0, Math.round(Number(shippingCents) || 0));
  return Math.round((taxableCents * TEXAS_SALES_TAX_RATE_BPS) / 10_000);
}

function salesTaxFor({ subtotalCents, shippingCents, zip }) {
  const applies = isTexasZip(zip);
  return {
    applies,
    ratePercent: applies ? TEXAS_SALES_TAX_RATE_PERCENT : null,
    cents: calculateTexasSalesTaxCents(subtotalCents, shippingCents, zip),
  };
}

module.exports = {
  TEXAS_SALES_TAX_RATE_PERCENT,
  TEXAS_SALES_TAX_RATE_BPS,
  isTexasZip,
  calculateTexasSalesTaxCents,
  salesTaxFor,
};
