/**
 * Work-order email and Shippo label utilities.
 *
 * These functions use a small provider-neutral sale object. Square owns the
 * customer payment and receipt; this module gives Jenna the production brief
 * and lets her buy USPS postage only when a necklace is ready to ship.
 */

const crypto = require('crypto');
const { sendMail } = require('./mailer.js');
const { PARCEL_DIMS, formatUSD } = require('./shared/catalog.js');
const { getOrigin, hasOrigin } = require('./origin.js');

const JENNA = process.env.OWNER_EMAIL || 'jenna.colvig@gmail.com';
const SHIPPO_TOKEN = process.env.SHIPPO_TOKEN || '';

function signOrder(orderId) {
  const key = process.env.LABEL_SIGNING_KEY;
  if (!key) throw new Error('LABEL_SIGNING_KEY not configured');
  return crypto.createHmac('sha256', key).update(orderId).digest('hex').slice(0, 32);
}

function verifyOrder(orderId, token) {
  let expected;
  try {
    expected = signOrder(orderId);
  } catch {
    return false;
  }
  const actual = Buffer.from(String(token || ''));
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addressBlock(ship) {
  if (!ship || !ship.address) return '<em>no address collected</em>';
  const a = ship.address;
  return [ship.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.postalCode}`, a.country]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br>');
}

function orderEmailHtml({ sale, labelUrl }) {
  const rows = sale.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #d3d6d0;vertical-align:top;">
          <div style="font-size:16px;color:#1b2a33;"><strong>${line.quantity} x ${escapeHtml(line.description)}</strong></div>
          ${
            line.spec
              ? `<div style="margin-top:6px;font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#8a6d3f;">${escapeHtml(line.spec)}</div>`
              : ''
          }
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #d3d6d0;text-align:right;vertical-align:top;white-space:nowrap;color:#1b2a33;">
          ${escapeHtml(formatUSD(line.totalCents))}
        </td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#edeeea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edeeea;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbfbf9;border:1px solid #1b2a33;">
  <tr><td style="padding:24px 28px 18px;border-bottom:1px solid #d3d6d0;">
    <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b969d;">New order</div>
    <div style="margin-top:8px;font-size:26px;color:#1b2a33;">${escapeHtml(formatUSD(sale.totalCents))} paid</div>
  </td></tr>
  <tr><td style="padding:8px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
  <tr><td style="padding:18px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#56646d;">
      <tr><td style="padding:3px 0;">Shipping charged</td><td style="text-align:right;color:#1b2a33;">${escapeHtml(formatUSD(sale.shippingCents))}</td></tr>
      <tr><td style="padding:3px 0;">Order total</td><td style="text-align:right;color:#1b2a33;"><strong>${escapeHtml(formatUSD(sale.totalCents))}</strong></td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 28px 20px;">
    <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b969d;padding-bottom:8px;">Ship to</div>
    <div style="font-size:15px;line-height:1.55;color:#1b2a33;">${addressBlock(sale.shipping)}</div>
    <div style="margin-top:10px;font-size:14px;color:#56646d;">${escapeHtml(sale.customer.email || '')}${sale.customer.phone ? ` &middot; ${escapeHtml(sale.customer.phone)}` : ''}</div>
  </td></tr>
  <tr><td style="padding:0 28px 28px;">
    <div style="background:#edeeea;border:1px solid #d3d6d0;padding:16px;">
      <div style="font-size:14px;color:#56646d;line-height:1.5;padding-bottom:12px;">Postage is not bought yet. Click this when the piece is finished and boxed, so the label carries the right ship date.</div>
      <a href="${labelUrl}" style="display:inline-block;background:#1b2a33;color:#edeeea;text-decoration:none;padding:13px 22px;font-size:15px;">Buy USPS label and print</a>
    </div>
  </td></tr>
  <tr><td style="padding:14px 28px;border-top:1px solid #d3d6d0;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#8b969d;">${escapeHtml(sale.id)}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function emailOrderToOwner({ sale, apiBase }) {
  const token = signOrder(sale.id);
  const labelUrl = `${apiBase}/label?order=${encodeURIComponent(sale.id)}&token=${token}`;
  const first = sale.lines[0];
  const subject = `New order: ${first ? first.spec || first.description : 'jewelry'} - ${formatUSD(sale.totalCents)}`;
  await sendMail({
    to: JENNA,
    subject,
    html: orderEmailHtml({ sale, labelUrl }),
    replyTo: sale.customer.email || undefined,
  });
}

function shippoReference(orderId) {
  return `square-order:${orderId}`;
}

function labelFromTransaction(transaction) {
  return {
    transactionId: transaction.object_id,
    labelPdf: transaction.label_url,
    tracking: transaction.tracking_number,
    trackingUrl: transaction.tracking_url_provider,
    cost: transaction.rate && transaction.rate.amount ? `$${transaction.rate.amount}` : null,
    status: transaction.status,
  };
}

async function shippoRequest(path, { method = 'GET', body } = {}) {
  if (!SHIPPO_TOKEN) throw new Error('SHIPPO_TOKEN not configured');
  const res = await fetch(`https://api.goshippo.com${path}`, {
    method,
    headers: {
      Authorization: `ShippoToken ${SHIPPO_TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json();
  if (!res.ok) {
    const detail = (payload.messages || []).map((message) => message.text).join('; ') || payload.detail || res.status;
    throw new Error(`Shippo request failed: ${detail}`);
  }
  return payload;
}

async function buyLabel(sale) {
  if (!hasOrigin()) {
    throw new Error('ORIGIN_JSON is not configured, so there is no return address to print.');
  }
  if (!sale.shipping || !sale.shipping.address || !sale.shipping.address.line1) {
    throw new Error('no shipping address on Square order');
  }

  const a = sale.shipping.address;
  const weightOz = parseFloat(sale.metadata.weight_oz || '4') || 4;
  const metadata = shippoReference(sale.id);
  const transaction = await shippoRequest('/transactions', {
    method: 'POST',
    body: {
      shipment: {
        address_from: getOrigin(),
        address_to: {
          name: sale.shipping.name,
          street1: a.line1,
          street2: a.line2 || '',
          city: a.city,
          state: a.state,
          zip: a.postalCode,
          country: a.country || 'US',
          email: sale.customer.email || '',
        },
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
        metadata,
      },
      carrier_account: process.env.SHIPPO_USPS_ACCOUNT || undefined,
      servicelevel_token: 'usps_ground_advantage',
      label_file_type: 'PDF_4x6',
      async: false,
      metadata,
    },
  });

  if (transaction.status !== 'SUCCESS') {
    const detail = (transaction.messages || []).map((message) => message.text).join('; ') || transaction.status;
    throw new Error(`label purchase failed: ${detail}`);
  }
  return labelFromTransaction(transaction);
}

async function retrieveLabel(transactionId) {
  const transaction = await shippoRequest(`/transactions/${encodeURIComponent(transactionId)}`);
  if (transaction.status !== 'SUCCESS') {
    throw new Error(`label transaction is ${transaction.status || 'not ready'}`);
  }
  return labelFromTransaction(transaction);
}

/**
 * Recovery only. Shippo does not offer a metadata filter, but this boutique
 * store has a small label volume and the first 100 successful transactions are
 * enough to recover a request that finished after a function crash.
 */
async function findLabelForOrder(orderId) {
  const payload = await shippoRequest('/transactions?results=100&object_status=SUCCESS');
  const match = (payload.results || []).find((transaction) => transaction.metadata === shippoReference(orderId));
  return match ? labelFromTransaction(match) : null;
}

async function emailTrackingToCustomer({ sale, label }) {
  const to = sale.customer.email;
  if (!to) return;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#edeeea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edeeea;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbfbf9;border:1px solid #1b2a33;">
  <tr><td style="padding:28px 28px 8px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b969d;">Eden Grace Jewelry Co.</div><div style="margin-top:10px;font-size:24px;color:#1b2a33;">Your piece is on its way</div></td></tr>
  <tr><td style="padding:8px 28px 24px;font-size:15px;line-height:1.6;color:#56646d;">It shipped USPS Ground Advantage today.<div style="margin-top:18px;padding:14px;background:#edeeea;border:1px solid #d3d6d0;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b969d;">Tracking</div><div style="margin-top:6px;font-family:ui-monospace,Menlo,monospace;font-size:16px;color:#1b2a33;">${escapeHtml(label.tracking)}</div>${label.trackingUrl ? `<a href="${escapeHtml(label.trackingUrl)}" style="display:inline-block;margin-top:12px;color:#8a6d3f;font-size:14px;">Track this package</a>` : ''}</div><p style="margin:22px 0 0;">Thank you for ordering something made by hand.</p></td></tr>
</table></td></tr></table>
</body></html>`;

  await sendMail({ to, subject: 'Your piece has shipped', html });
}

module.exports = {
  signOrder,
  verifyOrder,
  escapeHtml,
  emailOrderToOwner,
  buyLabel,
  retrieveLabel,
  findLabelForOrder,
  emailTrackingToCustomer,
};
