/**
 * edengracejewelry.com API, Cloud Functions gen2, Node 22.
 *
 * GitHub Pages hosts a static storefront. This function keeps Square and
 * Shippo credentials server-side, re-prices every cart item from the shared
 * catalog, creates Square-hosted checkout links, and handles paid orders.
 * Shippo is used only to quote postage. Square owns shipment fulfillment,
 * label purchase, and customer tracking notifications.
 */

const functions = require('@google-cloud/functions-framework');

const { priceCart, applyShippingRules } = require('./shared/pricing.js');
const { PARCEL_DIMS, FALLBACK_SHIPPING_CENTS, formatUSD } = require('./shared/catalog.js');
const { getOrigin } = require('./origin.js');
const {
  SquareApiError,
  createPaymentLink,
  retrieveOrder,
  retrievePayment,
  updateOrderMetadata,
  mergeOrderMetadata,
  verifyWebhookSignature,
  isStorefrontOrder,
  normalizeSquareSale,
} = require('./square.js');
const { emailOrderToOwner } = require('./orders.js');
const { subscribe, recordBuyer, SubscribeError } = require('./subscribers.js');

const SITE = process.env.SITE_URL || 'https://edengracejewelry.com';
const SHIPPO_TOKEN = process.env.SHIPPO_TOKEN || '';
const SQUARE_SHIPMENTS_URL = 'https://app.squareup.com/dashboard/orders/shipments/to-do';

const ALLOWED_ORIGINS = new Set([
  'https://edengracejewelry.com',
  'https://www.edengracejewelry.com',
  'https://jennasjewelry.com',
  'https://www.jennasjewelry.com',
  'http://localhost:3000',
]);

/* ------------------------------------------------------------------ *
 * Shipping
 * ------------------------------------------------------------------ */

const rateCache = new Map();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function cacheKey(zip, weightOz) {
  return `${zip.slice(0, 3)}:${weightOz <= 15.99 ? 'sub1lb' : Math.ceil(weightOz / 16)}`;
}

/** Ask Shippo for a live USPS Ground Advantage rate. */
async function quoteUSPS(zip, weightOz) {
  if (!SHIPPO_TOKEN) throw new Error('SHIPPO_TOKEN not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `ShippoToken ${SHIPPO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from: getOrigin(),
        // Rating only needs a destination ZIP. The checkout page collects the
        // full address directly through Square after this quote is shown.
        address_to: { zip, country: 'US' },
        parcels: [
          {
            length: String(PARCEL_DIMS.length),
            width: String(PARCEL_DIMS.width),
            height: String(PARCEL_DIMS.height),
            distance_unit: 'in',
            weight: (Math.max(weightOz, 1) / 16).toFixed(2),
            mass_unit: 'lb',
          },
        ],
        async: false,
      }),
    });

    if (!res.ok) throw new Error(`Shippo returned ${res.status}`);
    const body = await res.json();
    const ground = (body.rates || []).find(
      (rate) => rate.servicelevel && rate.servicelevel.token === 'usps_ground_advantage',
    );
    if (!ground) throw new Error('no USPS Ground Advantage rate returned');

    const days = Number(ground.estimated_days) || 5;
    return {
      cents: Math.round(parseFloat(ground.amount) * 100),
      service: 'USPS Ground Advantage',
      estimate: `Arrives in about ${days} business day${days === 1 ? '' : 's'}`,
      minDays: Math.max(2, days - 1),
      maxDays: days + 1,
      fallback: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getRate(zip, weightOz) {
  const key = cacheKey(zip, weightOz);
  const hit = rateCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rate;

  try {
    const rate = await quoteUSPS(zip, weightOz);
    rateCache.set(key, { at: Date.now(), rate });
    return rate;
  } catch (err) {
    console.error('shipping quote failed, using flat rate', {
      zip3: zip.slice(0, 3),
      weightOz,
      error: err.message,
    });
    return {
      cents: FALLBACK_SHIPPING_CENTS,
      service: 'USPS Ground Advantage',
      estimate: 'Arrives in about 5 business days',
      minDays: 2,
      maxDays: 6,
      fallback: true,
    };
  }
}

/* ------------------------------------------------------------------ *
 * HTTP plumbing
 * ------------------------------------------------------------------ */

const ZIP_RE = /^\d{5}$/;

function applyCors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
}

function routeName(req) {
  return (req.path || '/').replace(/\/+$/, '').split('/').pop() || '';
}

async function api(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');

  const route = routeName(req);
  try {
    if (route === 'webhook') return await handleWebhook(req, res);
    // Preserve old order-email links without retaining a second label-buying
    // system. Square requires authentication before showing the shipment.
    if (route === 'label') return res.redirect(302, SQUARE_SHIPMENTS_URL);
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (route === 'shipping-quote') return await handleQuote(req, res);
    // Leave the legacy route live during the deployment transition. It calls
    // the new Square code, so a cached GitHub Pages build keeps working.
    if (route === 'create-checkout-session' || route === 'create-payment-link') {
      return await handleCheckout(req, res);
    }
    if (route === 'subscribe') return await handleSubscribe(req, res);
    return res.status(404).json({ error: 'unknown route' });
  } catch (err) {
    console.error('unhandled error', { route, error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Something went wrong on our end.' });
  }
}

/* ------------------------------------------------------------------ *
 * Checkout
 * ------------------------------------------------------------------ */

function pricedCartFor(req) {
  const { zip, cart } = req.body || {};
  if (!ZIP_RE.test(String(zip || ''))) {
    return { error: 'Enter a five digit ZIP code.' };
  }

  const priced = priceCart(cart);
  if (priced.lines.length === 0) return { error: 'Cart is empty.' };
  if (priced.missingRequired.length > 0) return { error: priced.missingRequired[0] };
  return { zip: String(zip), priced };
}

async function handleQuote(req, res) {
  const input = pricedCartFor(req);
  if (input.error) return res.status(400).json({ error: input.error });

  const rate = await getRate(input.zip, input.priced.totalWeightOz);
  const shipping = applyShippingRules(input.priced.subtotalCents, rate.cents);
  return res.json({
    cents: rate.cents,
    chargedCents: shipping.chargedCents,
    free: shipping.free,
    service: rate.service,
    estimate: rate.estimate,
    fallback: rate.fallback,
  });
}

async function handleCheckout(req, res) {
  const input = pricedCartFor(req);
  if (input.error) return res.status(400).json({ error: input.error });

  // The quote shown in the cart is not trusted. Shipping is rated again before
  // the Square order is created, and every product price comes from catalog.js.
  const rate = await getRate(input.zip, input.priced.totalWeightOz);
  const shipping = applyShippingRules(input.priced.subtotalCents, rate.cents);
  const paymentLink = await createPaymentLink({
    priced: input.priced,
    rate,
    shipping,
    zip: input.zip,
    siteUrl: SITE,
  });

  return res.json({ url: paymentLink.url, orderId: paymentLink.order_id });
}

/* ------------------------------------------------------------------ *
 * Email capture
 * ------------------------------------------------------------------ */

/**
 * Cloud Run terminates TLS at a proxy, so req.ip is the proxy. The client
 * address is the first entry in X-Forwarded-For; everything after it was
 * appended by hops in between and the whole header is spoofable. It is used
 * only to bucket the rate limiter, never for access control.
 */
function clientIp(req) {
  const forwarded = req.get('x-forwarded-for') || '';
  return forwarded.split(',')[0].trim() || req.ip || 'unknown';
}

async function handleSubscribe(req, res) {
  const { email, source, company } = req.body || {};
  try {
    await subscribe({ email, source, honeypot: company, ip: clientIp(req) });
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof SubscribeError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('subscribe failed', { error: err.message });
    return res.status(502).json({ error: 'Could not save that address. Try again in a moment.' });
  }
}

/* ------------------------------------------------------------------ *
 * Square payment webhook and work-order email
 * ------------------------------------------------------------------ */

async function claimOwnerNotification(order) {
  const state = order.metadata && order.metadata.owner_email_state;
  if (state === 'sent' || state === 'sending') return null;

  try {
    return await updateOrderMetadata(order, { owner_email_state: 'sending' });
  } catch (err) {
    // Another webhook may have just claimed it. Do not retry the write, since a
    // retry after a version mismatch could turn two simultaneous webhooks into
    // two emails.
    if (err instanceof SquareApiError && err.code === 'VERSION_MISMATCH') return null;
    throw err;
  }
}

async function fulfillPayment(paymentId) {
  const payment = await retrievePayment(paymentId);
  if (payment.status !== 'COMPLETED' || !payment.order_id) return;

  const order = await retrieveOrder(payment.order_id);
  if (!isStorefrontOrder(order)) return;

  const claimed = await claimOwnerNotification(order);
  if (!claimed) return;

  const sale = normalizeSquareSale(claimed, payment);
  const quoted = String(sale.metadata.shipping_quote || '').split('|');
  const actualZip = sale.shipping.address.postalCode;
  if (quoted[0] && actualZip && quoted[0] !== actualZip) {
    console.warn('shipping address changed after quote', {
      orderId: sale.id,
      quotedZip: quoted[0],
      actualZip,
      chargedCents: sale.shippingCents,
    });
  }

  // Before the work order, because this is the only moment the buyer's address
  // passes through here. Never fatal: a directory write must not be able to
  // stop Jenna being told there is a piece to make.
  await recordBuyer(sale.customer.email).catch((err) =>
    console.error('could not record buyer in the customer directory', {
      orderId: sale.id,
      error: err.message,
    }),
  );

  try {
    await emailOrderToOwner({ sale });
    await mergeOrderMetadata(sale.id, { owner_email_state: 'sent' });
  } catch (err) {
    // Keep the order in the visible Square dashboard and log a clear failure.
    // A state is persisted before sending to prevent an uncertain mail result
    // from producing duplicate work orders on a replayed webhook.
    console.error('order email failed', { orderId: sale.id, error: err.message });
    await mergeOrderMetadata(sale.id, { owner_email_state: 'email_failed' }).catch((updateError) =>
      console.error('could not record email failure', { orderId: sale.id, error: updateError.message }),
    );
  }

  console.log('ORDER PAID', {
    orderId: sale.id,
    email: sale.customer.email,
    total: formatUSD(sale.totalCents),
    shipping: formatUSD(sale.shippingCents),
    items: sale.lines.map((line) => ({
      qty: line.quantity,
      description: line.description,
      spec: line.spec,
      amount: formatUSD(line.totalCents),
    })),
  });
}

async function handleWebhook(req, res) {
  const signature = req.get('x-square-hmacsha256-signature');
  const rawBody = req.rawBody;
  if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
    console.error('Square webhook signature verification failed');
    return res.status(400).send('Invalid webhook signature');
  }

  const event = req.body || JSON.parse(Buffer.from(rawBody).toString('utf8'));
  if (event.type !== 'payment.updated') return res.status(200).end();

  const payment = event.data && event.data.object && event.data.object.payment;
  if (!payment || payment.status !== 'COMPLETED' || !payment.id) return res.status(200).end();
  // A subscription can receive activity for more than one seller location.
  // Square's test event also uses a synthetic location, so ignore anything
  // outside Jenna's configured online-checkout location before it can become
  // a work order.
  if (
    process.env.SQUARE_LOCATION_ID &&
    payment.location_id &&
    payment.location_id !== process.env.SQUARE_LOCATION_ID
  ) {
    return res.status(200).end();
  }

  await fulfillPayment(payment.id);
  return res.status(200).end();
}

functions.http('api', api);

module.exports = {
  api,
  buildShippingQuote: getRate,
};
