/**
 * Minimal Square Checkout, Orders, Payments, and webhook client.
 *
 * The storefront is static, so this module is deliberately server-only. It
 * creates Square-hosted payment links and keeps the access token out of the
 * browser and out of the public GitHub Pages build.
 */

const crypto = require('crypto');

const STORE_FRONT = 'edengracejewelry.com';
const DEFAULT_API_VERSION = '2026-07-15';

class SquareApiError extends Error {
  constructor(message, { status, code, detail } = {}) {
    super(message);
    this.name = 'SquareApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function requireSetting(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function apiBase() {
  return (process.env.SQUARE_API_BASE || 'https://connect.squareup.com/v2').replace(/\/$/, '');
}

function apiVersion() {
  return process.env.SQUARE_API_VERSION || DEFAULT_API_VERSION;
}

function moneyCents(money) {
  const amount = Number(money && money.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function lineTotalCents(line) {
  const total = moneyCents(line.total_money);
  if (total) return total;
  return moneyCents(line.base_price_money) * Number(line.quantity || 0);
}

function orderReference(idempotencyKey) {
  return `egj_${String(idempotencyKey).replace(/-/g, '').slice(0, 32)}`;
}

/**
 * This builder is intentionally pure so tests can prove exactly what is sent
 * to Square. The server has already re-priced every cart item before calling
 * it; no amount in this payload comes from the browser's request body.
 */
function buildPaymentLinkPayload({
  priced,
  rate,
  shipping,
  zip,
  siteUrl,
  locationId,
  idempotencyKey = crypto.randomUUID(),
}) {
  const checkoutOptions = {
    ask_for_shipping_address: true,
    allow_tipping: false,
    redirect_url: `${String(siteUrl).replace(/\/$/, '')}/success/`,
  };

  // Square treats a hosted-checkout shipping fee as an order service charge.
  // Omit the field entirely for free shipping instead of sending a $0 fee.
  if (shipping.chargedCents > 0) {
    checkoutOptions.shipping_fee = {
      name: rate.service,
      charge: { amount: shipping.chargedCents, currency: 'USD' },
    };
  }

  return {
    idempotency_key: idempotencyKey,
    order: {
      location_id: locationId,
      reference_id: orderReference(idempotencyKey),
      source: { name: 'Eden Grace Jewelry website' },
      line_items: priced.lines.map((line) => ({
        name: line.name,
        quantity: String(line.qty),
        base_price_money: { amount: line.unitCents, currency: 'USD' },
        // The note is the bench-ready custom specification.
        note: line.description.slice(0, 2_000),
      })),
      // Metadata is private to this Square application. It contains no buyer
      // data and leaves room for the fulfillment and label state below.
      metadata: {
        storefront: STORE_FRONT,
        weight_oz: priced.totalWeightOz.toFixed(2),
        shipping_quote: `${zip}|${shipping.chargedCents}|${rate.fallback ? 'fallback' : 'live'}`,
      },
    },
    checkout_options: checkoutOptions,
    payment_note: 'Eden Grace Jewelry website order',
  };
}

async function squareRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireSetting('SQUARE_ACCESS_TOKEN')}`,
      'Square-Version': apiVersion(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    const first = Array.isArray(payload.errors) ? payload.errors[0] : undefined;
    throw new SquareApiError(
      first && first.detail ? first.detail : `Square request failed (${res.status})`,
      {
        status: res.status,
        code: first && first.code,
        detail: first && first.detail,
      },
    );
  }

  return payload;
}

async function createPaymentLink(args) {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error('SQUARE_LOCATION_ID is not configured');

  const payload = buildPaymentLinkPayload({ ...args, locationId });
  const result = await squareRequest('/online-checkout/payment-links', {
    method: 'POST',
    body: payload,
  });

  if (!result.payment_link || !result.payment_link.url || !result.payment_link.order_id) {
    throw new Error('Square did not return a usable payment link');
  }
  return result.payment_link;
}

async function retrieveOrder(orderId) {
  const result = await squareRequest(`/orders/${encodeURIComponent(orderId)}`);
  if (!result.order) throw new Error('Square did not return the order');
  return result.order;
}

async function retrievePayment(paymentId) {
  const result = await squareRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (!result.payment) throw new Error('Square did not return the payment');
  return result.payment;
}

function mergedMetadata(current, changes) {
  const metadata = { ...(current || {}) };
  for (const [key, value] of Object.entries(changes || {})) {
    if (value === undefined || value === null || value === '') delete metadata[key];
    else metadata[key] = String(value).slice(0, 255);
  }
  return metadata;
}

/**
 * Square Order updates use optimistic locking. Callers which are trying to
 * claim work must use this once and handle a VERSION_MISMATCH themselves,
 * otherwise two concurrent callers could both believe they won a claim.
 */
async function updateOrderMetadata(order, changes) {
  if (!order || !order.id || typeof order.version !== 'number') {
    throw new Error('Square order is missing an id or update version');
  }
  if (order.state !== 'OPEN') {
    throw new SquareApiError('This Square order can no longer be updated.', {
      status: 409,
      code: 'ORDER_NOT_OPEN',
    });
  }

  const result = await squareRequest(`/orders/${encodeURIComponent(order.id)}`, {
    method: 'PUT',
    body: {
      idempotency_key: crypto.randomUUID(),
      order: {
        version: order.version,
        metadata: mergedMetadata(order.metadata, changes),
      },
    },
  });

  if (!result.order) throw new Error('Square did not return the updated order');
  return result.order;
}

/** Safe metadata merge for updates that do not acquire a shared lock. */
async function mergeOrderMetadata(orderId, changes, attempts = 3) {
  let order = await retrieveOrder(orderId);
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await updateOrderMetadata(order, changes);
    } catch (err) {
      lastError = err;
      if (!(err instanceof SquareApiError) || err.code !== 'VERSION_MISMATCH') throw err;
      order = await retrieveOrder(orderId);
    }
  }

  throw lastError || new Error('Square metadata update failed');
}

function rawBodyText(rawBody) {
  if (Buffer.isBuffer(rawBody)) return rawBody.toString('utf8');
  return String(rawBody || '');
}

/**
 * Square signs the exact URL string followed by the unparsed HTTP body.
 * Parsing and re-serializing JSON changes the byte sequence and invalidates a
 * valid signature, so the caller passes the function framework's rawBody.
 */
function verifyWebhookSignature(rawBody, signature, {
  signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  notificationUrl = process.env.SQUARE_WEBHOOK_URL,
} = {}) {
  if (!signatureKey || !notificationUrl || !signature) return false;
  const expected = crypto
    .createHmac('sha256', signatureKey)
    .update(`${notificationUrl}${rawBodyText(rawBody)}`, 'utf8')
    .digest('base64');
  const actualBuffer = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function isStorefrontOrder(order) {
  return Boolean(order && order.metadata && order.metadata.storefront === STORE_FRONT);
}

async function getCompletedPaymentForOrder(order) {
  const paymentIds = [...new Set(
    (order.tenders || [])
      .map((tender) => tender.payment_id || tender.id)
      .filter(Boolean),
  )];

  for (const paymentId of paymentIds) {
    const payment = await retrievePayment(paymentId);
    if (payment.status === 'COMPLETED' && payment.order_id === order.id) return payment;
  }
  return null;
}

function recipientFor(order) {
  const fulfillment = (order.fulfillments || []).find(
    (entry) => entry.type === 'SHIPMENT' && entry.shipment_details,
  );
  return (fulfillment && fulfillment.shipment_details && fulfillment.shipment_details.recipient) || {};
}

function normalizeSquareSale(order, payment) {
  const recipient = recipientFor(order);
  const address = payment.shipping_address || recipient.address || {};
  const name =
    recipient.display_name ||
    [address.first_name, address.last_name].filter(Boolean).join(' ') ||
    'Customer';

  const serviceCharges = (order.service_charges || []).reduce(
    (sum, charge) => sum + moneyCents(charge.total_money || charge.applied_money || charge.amount_money),
    0,
  );

  return {
    id: order.id,
    referenceId: order.reference_id || '',
    totalCents: moneyCents(order.total_money) || moneyCents(payment.total_money),
    shippingCents: serviceCharges || moneyCents(order.total_service_charge_money),
    metadata: order.metadata || {},
    lines: (order.line_items || []).map((line) => ({
      quantity: Number(line.quantity || 0),
      description: line.name || 'Custom necklace',
      spec: line.note || '',
      totalCents: lineTotalCents(line),
    })),
    customer: {
      email: payment.buyer_email_address || recipient.email_address || '',
      phone: recipient.phone_number || '',
    },
    shipping: {
      name,
      address: {
        line1: address.address_line_1 || address.line1 || '',
        line2: address.address_line_2 || address.line2 || '',
        city: address.locality || address.city || '',
        state: address.administrative_district_level_1 || address.state || '',
        postalCode: address.postal_code || address.zip || '',
        country: address.country || address.country_code || 'US',
      },
    },
  };
}

module.exports = {
  STORE_FRONT,
  SquareApiError,
  buildPaymentLinkPayload,
  createPaymentLink,
  retrieveOrder,
  retrievePayment,
  updateOrderMetadata,
  mergeOrderMetadata,
  verifyWebhookSignature,
  isStorefrontOrder,
  getCompletedPaymentForOrder,
  normalizeSquareSale,
};
