/**
 * edengracejewelry.com API, Cloud Functions gen2, Node 22.
 *
 * GitHub Pages hosts a static storefront. This function keeps Square and
 * Shippo credentials server-side, re-prices every cart item from the shared
 * catalog, creates Square-hosted checkout links, and handles paid orders.
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
  getCompletedPaymentForOrder,
  normalizeSquareSale,
} = require('./square.js');
const {
  verifyOrder,
  escapeHtml,
  emailOrderToOwner,
  buyLabel,
  retrieveLabel,
  findLabelForOrder,
  emailTrackingToCustomer,
} = require('./orders.js');

const SITE = process.env.SITE_URL || 'https://edengracejewelry.com';
const API_BASE = (process.env.API_BASE_URL || '').replace(/\/$/, '');
const SHIPPO_TOKEN = process.env.SHIPPO_TOKEN || '';

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
    if (route === 'label') return await handleLabel(req, res);
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (route === 'shipping-quote') return await handleQuote(req, res);
    // Leave the legacy route live during the deployment transition. It calls
    // the new Square code, so a cached GitHub Pages build keeps working.
    if (route === 'create-checkout-session' || route === 'create-payment-link') {
      return await handleCheckout(req, res);
    }
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

  if (!API_BASE) throw new Error('API_BASE_URL is not configured');

  try {
    await emailOrderToOwner({ sale, apiBase: API_BASE });
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

/* ------------------------------------------------------------------ *
 * Label purchase, clicked from Jenna's signed order email
 * ------------------------------------------------------------------ */

function labelPage({ title, body, primary, primaryHref }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#edeeea;font-family:system-ui,sans-serif;color:#1b2a33;">
<div style="max-width:460px;margin:0 auto;padding:48px 20px;"><div style="background:#fbfbf9;border:1px solid #1b2a33;padding:28px;">
<h1 style="margin:0 0 14px;font-size:22px;font-weight:600;">${escapeHtml(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#56646d;">${body}</div>
${primary ? `<a href="${escapeHtml(primaryHref)}" style="display:block;margin-top:22px;background:#1b2a33;color:#edeeea;text-decoration:none;padding:14px;text-align:center;font-size:16px;">${escapeHtml(primary)}</a>` : ''}
</div></div></body></html>`;
}

function sendLabelPage(res, page, status = 200) {
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.status(status).send(page);
}

function labelResultPage({ title, label, alreadyBought = false }) {
  return labelPage({
    title,
    body: `${alreadyBought ? 'Postage was already purchased, so this click did not charge anything.<br><br>' : ''}Tracking <strong>${escapeHtml(label.tracking || 'unknown')}</strong>${label.cost ? ` &middot; ${escapeHtml(label.cost)}` : ''}<br><br>${alreadyBought ? '' : 'The customer has been emailed the tracking number. '}Print on a 4x6 label or on paper and tape it down.`,
    primary: 'Open the label PDF',
    primaryHref: label.labelPdf,
  });
}

async function recoverBuyingLabel(order) {
  try {
    const label = await findLabelForOrder(order.id);
    if (!label) return null;
    await mergeOrderMetadata(order.id, {
      label_state: 'bought',
      label_tx: label.transactionId,
      label_tracking: label.tracking,
      label_lock_at: null,
    }).catch((err) => console.error('could not persist recovered label', { orderId: order.id, error: err.message }));
    return label;
  } catch (err) {
    console.error('could not check Shippo for an in-progress label', { orderId: order.id, error: err.message });
    return null;
  }
}

async function handleLabel(req, res) {
  const orderId = String(req.query.order || '');
  const token = String(req.query.token || '');

  if (!orderId) {
    const oldSession = String(req.query.session || '');
    return sendLabelPage(
      res,
      labelPage({
        title: oldSession ? 'This old label link needs review' : 'That link is not valid',
        body: oldSession
          ? 'This order was created before the Square checkout switch. Check it in the old payment dashboard before buying postage.'
          : 'Open the complete link from the order email.',
      }),
      403,
    );
  }
  if (!verifyOrder(orderId, token)) {
    return sendLabelPage(
      res,
      labelPage({
        title: 'That link is not valid',
        body: 'The link signature did not match. Open the complete link from the order email.',
      }),
      403,
    );
  }

  let order = await retrieveOrder(orderId);
  if (!isStorefrontOrder(order)) {
    return sendLabelPage(res, labelPage({ title: 'That order is not available', body: 'Check the Square dashboard before buying postage.' }), 403);
  }

  const payment = await getCompletedPaymentForOrder(order);
  if (!payment) {
    return sendLabelPage(res, labelPage({ title: 'This order is not paid', body: 'No label was bought. Check the Square order before shipping anything.' }), 409);
  }

  // Try twice only. A version conflict means another browser opened the same
  // signed link, and the refreshed order tells this request which one won.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const metadata = order.metadata || {};
    if (metadata.label_tx) {
      try {
        const label = await retrieveLabel(metadata.label_tx);
        return sendLabelPage(res, labelResultPage({ title: 'Label already bought', label, alreadyBought: true }));
      } catch {
        return sendLabelPage(
          res,
          labelPage({
            title: 'Label needs a quick check',
            body: `A label transaction is already recorded for this order. Open Shippo and search for order <code>${escapeHtml(order.id)}</code> before buying another one.`,
          }),
          409,
        );
      }
    }

    if (metadata.label_state === 'buying' || metadata.label_state === 'bought') {
      const recovered = await recoverBuyingLabel(order);
      if (recovered) {
        return sendLabelPage(res, labelResultPage({ title: 'Label already bought', label: recovered, alreadyBought: true }));
      }
      return sendLabelPage(
        res,
        labelPage({
          title: 'A label request is pending',
          body: `This order is already reserved for a label purchase. Check Shippo for order <code>${escapeHtml(order.id)}</code> before trying again, so postage is never charged twice.`,
        }),
        409,
      );
    }

    if (order.state !== 'OPEN') {
      return sendLabelPage(
        res,
        labelPage({
          title: 'This Square order is closed',
          body: 'Square will not let this order record a label safely. Buy the label from the Shippo dashboard after checking the paid order.',
        }),
        409,
      );
    }

    let claimed;
    try {
      claimed = await updateOrderMetadata(order, {
        label_state: 'buying',
        label_lock_at: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof SquareApiError && err.code === 'VERSION_MISMATCH') {
        order = await retrieveOrder(orderId);
        continue;
      }
      throw err;
    }

    const sale = normalizeSquareSale(claimed, payment);
    let label;
    try {
      label = await buyLabel(sale);
    } catch (err) {
      console.error('label purchase failed', { orderId, error: err.message });
      await mergeOrderMetadata(orderId, { label_state: 'ready', label_lock_at: null }).catch((updateError) =>
        console.error('could not release label claim', { orderId, error: updateError.message }),
      );
      return sendLabelPage(
        res,
        labelPage({
          title: 'Could not buy the label',
          body: `USPS or Shippo refused the purchase. Nothing was charged. You can buy this one by hand in the Shippo dashboard.<br><br><code style="font-size:13px;color:#a4442f;">${escapeHtml(String(err.message).slice(0, 200))}</code>`,
        }),
        502,
      );
    }

    await mergeOrderMetadata(orderId, {
      label_state: 'bought',
      label_tx: label.transactionId,
      label_tracking: label.tracking,
      label_lock_at: null,
    }).catch((err) =>
      // The pre-purchase claim stays in Square. If this write fails after a
      // successful Shippo charge, a later click searches Shippo by order id
      // instead of buying a second label.
      console.error('could not persist bought label', { orderId, error: err.message }),
    );

    try {
      await emailTrackingToCustomer({ sale, label });
    } catch (err) {
      console.error('tracking email failed', { orderId, error: err.message });
    }

    console.log('LABEL BOUGHT', { orderId, tracking: label.tracking, cost: label.cost });
    return sendLabelPage(res, labelResultPage({ title: 'Label bought', label }));
  }

  return sendLabelPage(
    res,
    labelPage({
      title: 'A label request is already open',
      body: 'Refresh once. If this page remains, check Shippo before buying another label.',
    }),
    409,
  );
}

functions.http('api', api);

module.exports = {
  api,
  buildShippingQuote: getRate,
};
