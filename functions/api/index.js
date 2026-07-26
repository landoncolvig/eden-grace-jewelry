/**
 * jennasjewelry.com API — GCP Cloud Function (gen2, Node 22).
 *
 * The storefront is a static export on GitHub Pages, which cannot hold a
 * secret. This function is the only place the Stripe key and the Shippo token
 * exist. It does three things:
 *
 *   POST /shipping-quote            live USPS Ground Advantage rate for a ZIP
 *   POST /create-checkout-session   re-price the cart, re-quote, hand to Stripe
 *   POST /webhook                   Stripe tells us an order was actually paid
 *
 * The rule that matters: the browser sends item ids and a ZIP, never a price.
 * Every amount charged is derived here from shared/catalog.js. The quote the
 * customer saw in the cart is not trusted either; it is recomputed before the
 * session is created, so a stale or edited quote cannot underpay postage.
 */

const functions = require('@google-cloud/functions-framework');
const Stripe = require('stripe');

const { priceCart, applyShippingRules } = require('./shared/pricing.js');
const {
  ORIGIN,
  PARCEL_DIMS,
  FALLBACK_SHIPPING_CENTS,
  formatUSD,
} = require('./shared/catalog.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Pinning means a Stripe-side API change cannot silently alter behaviour.
  apiVersion: '2025-03-31.basil',
});

const SITE = process.env.SITE_URL || 'https://jennasjewelry.com';
const SHIPPO_TOKEN = process.env.SHIPPO_TOKEN || '';

const ALLOWED_ORIGINS = new Set([
  'https://jennasjewelry.com',
  'https://www.jennasjewelry.com',
  'http://localhost:3000',
]);

/* ------------------------------------------------------------------ *
 * Shipping
 * ------------------------------------------------------------------ */

/**
 * USPS repriced Ground Advantage on 2026-07-12: the 4oz / 8oz / 12oz / 15.99oz
 * commercial tiers collapsed into one. Every piece in this catalog ships under
 * a pound, so weight no longer moves the price and only the destination zone
 * does. That makes the rate almost perfectly cacheable on ZIP3, and it is why
 * a jewelry store can get away with one quote per prefix rather than per order.
 */
const rateCache = new Map();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function cacheKey(zip, weightOz) {
  // ZIP3 determines the zone. Weight is bucketed at the pound boundary because
  // that is the only place the price actually steps.
  return `${zip.slice(0, 3)}:${weightOz <= 15.99 ? 'sub1lb' : Math.ceil(weightOz / 16)}`;
}

/**
 * Ask Shippo for a live USPS Ground Advantage rate.
 *
 * Shippo is used rather than the USPS API directly for two reasons: USPS
 * requires CRID/MID enrollment that takes weeks, and without an Enterprise
 * Payment Account it only returns retail prices, which run 19-42% above what
 * Jenna actually pays to print the label. Quoting retail would overcharge the
 * customer on every order.
 *
 * Never blocks a sale. If Shippo is slow or down, the caller falls back.
 */
async function quoteUSPS(zip, weightOz) {
  if (!SHIPPO_TOKEN) throw new Error('SHIPPO_TOKEN not configured');

  const controller = new AbortController();
  // A checkout that hangs on a third-party rate call converts worse than one
  // that charges a slightly imprecise flat rate.
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
        address_from: {
          name: ORIGIN.name,
          street1: ORIGIN.street1,
          city: ORIGIN.city,
          state: ORIGIN.state,
          zip: ORIGIN.zip,
          country: 'US',
        },
        // Rating only needs the destination ZIP, so nothing else about the
        // customer is sent to Shippo at quote time.
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

    if (!res.ok) throw new Error(`shippo ${res.status}`);
    const body = await res.json();

    const ground = (body.rates || []).find(
      (r) => r.servicelevel && r.servicelevel.token === 'usps_ground_advantage',
    );
    if (!ground) throw new Error('no ground advantage rate returned');

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

/** Quote with cache and a rate that never blocks the sale. */
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
    // Deliberately not cached: a transient Shippo outage should not pin the
    // flat rate in place for the next twelve hours.
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

function applyCors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
}

const ZIP_RE = /^\d{5}$/;

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

functions.http('api', async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');

  // Route on the trailing path segment so one function serves all three
  // endpoints behind a single URL.
  const route = (req.path || '/').replace(/\/+$/, '').split('/').pop();

  try {
    if (route === 'webhook') return await handleWebhook(req, res);
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (route === 'shipping-quote') return await handleQuote(req, res);
    if (route === 'create-checkout-session') return await handleCheckout(req, res);
    return res.status(404).json({ error: 'unknown route' });
  } catch (err) {
    console.error('unhandled error', { route, error: err.message, stack: err.stack });
    // Never echo err.message to the browser: it can carry key fragments and
    // internal detail. The log has the real cause.
    return res.status(500).json({ error: 'Something went wrong on our end.' });
  }
});

async function handleQuote(req, res) {
  const { zip, cart } = req.body || {};
  if (!ZIP_RE.test(String(zip || ''))) {
    return res.status(400).json({ error: 'Enter a five digit ZIP code.' });
  }

  const priced = priceCart(cart);
  if (priced.lines.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const rate = await getRate(String(zip), priced.totalWeightOz);
  const applied = applyShippingRules(priced.subtotalCents, rate.cents);

  return res.json({
    cents: rate.cents,
    chargedCents: applied.chargedCents,
    free: applied.free,
    service: rate.service,
    estimate: rate.estimate,
    fallback: rate.fallback,
  });
}

async function handleCheckout(req, res) {
  const { zip, cart } = req.body || {};
  if (!ZIP_RE.test(String(zip || ''))) {
    return res.status(400).json({ error: 'Enter a five digit ZIP code.' });
  }

  // Re-priced here, from the catalog, ignoring anything the browser claimed.
  const priced = priceCart(cart);

  if (priced.lines.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  if (priced.missingRequired.length > 0) {
    // There is nothing to manufacture without this, so it is a hard stop
    // rather than a warning.
    return res.status(400).json({ error: priced.missingRequired[0] });
  }

  // Re-quoted here too. The cart showed a number, but that number is not an
  // input to what gets charged.
  const rate = await getRate(String(zip), priced.totalWeightOz);
  const shipping = applyShippingRules(priced.subtotalCents, rate.cents);

  const line_items = priced.lines.map((line) => ({
    quantity: line.qty,
    price_data: {
      currency: 'usd',
      unit_amount: line.unitCents,
      product_data: {
        name: line.name,
        // The spec, so it appears on the Stripe page, the receipt, and the
        // dashboard. Jenna reads this to know what to cut.
        description: line.description.slice(0, 500),
      },
    },
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,

    shipping_address_collection: { allowed_countries: ['US'] },

    // Quoted before the session because Stripe's hosted page has no server
    // callback to recalculate after the customer types an address.
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shipping.free ? 'Free shipping' : rate.service,
          fixed_amount: { amount: shipping.chargedCents, currency: 'usd' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: rate.minDays },
            maximum: { unit: 'business_day', value: rate.maxDays },
          },
          // Shipping taxability varies by state; this lets Stripe Tax decide
          // rather than guessing.
          tax_behavior: 'exclusive',
          tax_code: 'txcd_92010001',
        },
      },
    ],

    phone_number_collection: { enabled: true },

    // Read at fulfillment. quoted_zip vs the address Stripe finally collects is
    // the reconciliation check for someone who changes their address on the
    // Stripe page after we quoted.
    metadata: {
      quoted_zip: String(zip),
      quoted_shipping_cents: String(shipping.chargedCents),
      quote_was_fallback: String(rate.fallback),
      total_weight_oz: priced.totalWeightOz.toFixed(2),
      spec: priced.lines
        .map((l) => `${l.qty}x ${l.name} [${l.description}]`)
        .join(' ;; ')
        .slice(0, 500),
    },

    success_url: `${SITE}/success/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/cart/`,
  });

  return res.json({ url: session.url });
}

/* ------------------------------------------------------------------ *
 * Fulfillment
 * ------------------------------------------------------------------ */

// Stripe explicitly warns this handler can fire more than once, concurrently,
// for the same session. Instance memory is not a real idempotency store; it is
// enough to stop a duplicate inside one instance, and the TODO below is the
// honest fix once Jenna has somewhere to write orders.
const fulfilled = new Set();

async function handleWebhook(req, res) {
  const signature = req.get('stripe-signature');
  let event;

  try {
    // rawBody, not the parsed body: signature verification is over the exact
    // bytes Stripe sent, and JSON.parse/stringify does not round-trip them.
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    // Acknowledge fast. Stripe holds the customer's redirect for up to 10
    // seconds waiting on this response.
    res.status(200).end();
    await fulfill(event.data.object.id).catch((err) =>
      console.error('fulfillment failed', { session: event.data.object.id, error: err.message }),
    );
    return;
  }

  return res.status(200).end();
}

async function fulfill(sessionId) {
  if (fulfilled.has(sessionId)) return;

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    // The webhook payload does not embed line items; they have to be expanded.
    expand: ['line_items', 'shipping_cost.shipping_rate'],
  });

  if (session.payment_status === 'unpaid') return;
  fulfilled.add(sessionId);

  const ship = session.collected_information && session.collected_information.shipping_details;
  const quotedZip = session.metadata && session.metadata.quoted_zip;
  const actualZip = ship && ship.address && ship.address.postal_code;

  // The customer can change their address on the Stripe page after we quoted.
  // Under the post-July-2026 sub-1lb pricing the whole zone spread is only a
  // few dollars, so this is worth knowing about rather than worth blocking.
  if (quotedZip && actualZip && quotedZip !== actualZip) {
    console.warn('shipping address changed after quote', {
      sessionId,
      quotedZip,
      actualZip,
      chargedCents: session.shipping_cost && session.shipping_cost.amount_total,
    });
  }

  console.log('ORDER PAID', {
    sessionId,
    email: session.customer_details && session.customer_details.email,
    phone: session.customer_details && session.customer_details.phone,
    total: formatUSD(session.amount_total),
    shipping: session.shipping_cost ? formatUSD(session.shipping_cost.amount_total) : null,
    shipTo: ship,
    spec: session.metadata && session.metadata.spec,
    items: (session.line_items.data || []).map((li) => ({
      qty: li.quantity,
      description: li.description,
      amount: formatUSD(li.amount_total),
    })),
  });

  // TODO: persist the order and email Jenna. Until then the record of what to
  // make lives in the Stripe dashboard and in this log line, both of which are
  // durable. A Firestore write here would also give real idempotency, which
  // the in-memory Set above only approximates.
}
