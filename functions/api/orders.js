/**
 * What happens after money changes hands.
 *
 * Stripe emails the customer their receipt, so nothing here duplicates that.
 * This module sends Jenna the work order, and later buys the USPS label when
 * she says the piece is finished.
 *
 * The label is deliberately NOT bought at payment time. Pieces take 10 to 14
 * days to make, and a label bought on day zero is real money spent on an order
 * that might be refunded, carrying a ship date two weeks before the parcel
 * exists. So the order email carries a signed link she clicks when the piece is
 * done, and that is the moment postage gets purchased.
 */

const crypto = require('crypto');
const { sendMail } = require('./mailer.js');
const { PARCEL_DIMS, formatUSD } = require('./shared/catalog.js');
const { getOrigin, hasOrigin } = require('./origin.js');

const JENNA = process.env.OWNER_EMAIL || 'jenna.colvig@gmail.com';
const SHIPPO_TOKEN = process.env.SHIPPO_TOKEN || '';

/* ------------------------------------------------------------------ *
 * Link signing
 * ------------------------------------------------------------------ */

/**
 * The buy-label link spends money, so it cannot be a bare session id in a URL.
 * An HMAC over the session id means only links this function generated will be
 * honoured, and a crawler that follows the link out of an inbox cannot ring up
 * postage on someone else's order.
 */
function signSession(sessionId) {
  const key = process.env.LABEL_SIGNING_KEY;
  if (!key) throw new Error('LABEL_SIGNING_KEY not configured');
  return crypto.createHmac('sha256', key).update(sessionId).digest('hex').slice(0, 32);
}

function verifySession(sessionId, token) {
  let expected;
  try {
    expected = signSession(sessionId);
  } catch {
    return false;
  }
  const a = Buffer.from(String(token || ''));
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a length mismatch.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ *
 * The work order email
 * ------------------------------------------------------------------ */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addressBlock(ship) {
  if (!ship || !ship.address) return '<em>no address collected</em>';
  const a = ship.address;
  return [ship.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.postal_code}`, a.country]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br>');
}

/**
 * Plain, high-contrast, table-based HTML. Gmail strips most CSS, so the layout
 * cannot depend on flexbox or external styles. She reads this on a phone while
 * standing at the bench, so the spec is the largest thing on the page.
 */
function orderEmailHtml({ session, items, labelUrl }) {
  const ship = session.collected_information && session.collected_information.shipping_details;
  const cust = session.customer_details || {};

  const rows = items
    .map(
      (li) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #d3d6d0;vertical-align:top;">
          <div style="font-size:16px;color:#1b2a33;"><strong>${li.quantity} x ${escapeHtml(li.description)}</strong></div>
          ${
            li.spec
              ? `<div style="margin-top:6px;font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#8a6d3f;">${escapeHtml(li.spec)}</div>`
              : ''
          }
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #d3d6d0;text-align:right;vertical-align:top;white-space:nowrap;color:#1b2a33;">
          ${escapeHtml(li.amount)}
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
    <div style="margin-top:8px;font-size:26px;color:#1b2a33;">${escapeHtml(formatUSD(session.amount_total))} paid</div>
  </td></tr>

  <tr><td style="padding:8px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>

  <tr><td style="padding:18px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#56646d;">
      <tr><td style="padding:3px 0;">Shipping charged</td><td style="text-align:right;color:#1b2a33;">${
        session.shipping_cost ? escapeHtml(formatUSD(session.shipping_cost.amount_total)) : '—'
      }</td></tr>
      <tr><td style="padding:3px 0;">Order total</td><td style="text-align:right;color:#1b2a33;"><strong>${escapeHtml(
        formatUSD(session.amount_total),
      )}</strong></td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 28px 20px;">
    <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b969d;padding-bottom:8px;">Ship to</div>
    <div style="font-size:15px;line-height:1.55;color:#1b2a33;">${addressBlock(ship)}</div>
    <div style="margin-top:10px;font-size:14px;color:#56646d;">
      ${escapeHtml(cust.email || '')}${cust.phone ? ` &middot; ${escapeHtml(cust.phone)}` : ''}
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 28px;">
    <div style="background:#edeeea;border:1px solid #d3d6d0;padding:16px;">
      <div style="font-size:14px;color:#56646d;line-height:1.5;padding-bottom:12px;">
        Postage is not bought yet. Click this when the piece is finished and boxed,
        so the label carries the right ship date.
      </div>
      <a href="${labelUrl}" style="display:inline-block;background:#1b2a33;color:#edeeea;text-decoration:none;padding:13px 22px;font-size:15px;">
        Buy USPS label and print
      </a>
    </div>
  </td></tr>

  <tr><td style="padding:14px 28px;border-top:1px solid #d3d6d0;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#8b969d;">
    ${escapeHtml(session.id)}
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

async function emailOrderToOwner({ session, items, apiBase }) {
  const token = signSession(session.id);
  const labelUrl = `${apiBase}/label?session=${encodeURIComponent(session.id)}&token=${token}`;

  const first = items[0];
  const subject = `New order: ${first ? first.spec || first.description : 'jewelry'} — ${formatUSD(
    session.amount_total,
  )}`;

  await sendMail({
    to: JENNA,
    subject,
    html: orderEmailHtml({ session, items, labelUrl }),
    // So hitting reply goes to the customer rather than into the void.
    replyTo: (session.customer_details && session.customer_details.email) || undefined,
  });
}

/* ------------------------------------------------------------------ *
 * Buying the label
 * ------------------------------------------------------------------ */

/**
 * Buy a USPS Ground Advantage label for a paid session.
 *
 * Rating and purchasing are different operations: this one moves money out of
 * the Shippo balance, which is why it sits behind a signed link and is only
 * reachable once per order.
 */
async function buyLabel(session) {
  if (!SHIPPO_TOKEN) throw new Error('SHIPPO_TOKEN not configured');
  if (!hasOrigin()) {
    // A label with a broken return address is worse than no label: USPS will
    // still carry it, and an undeliverable parcel has nowhere to come back to.
    throw new Error(
      'ORIGIN_JSON is not configured, so there is no return address to print.',
    );
  }

  const ship = session.collected_information && session.collected_information.shipping_details;
  if (!ship || !ship.address) throw new Error('no shipping address on session');

  const weightOz = parseFloat((session.metadata && session.metadata.total_weight_oz) || '4') || 4;

  const res = await fetch('https://api.goshippo.com/transactions', {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${SHIPPO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shipment: {
        address_from: getOrigin(),
        address_to: {
          name: ship.name,
          street1: ship.address.line1,
          street2: ship.address.line2 || '',
          city: ship.address.city,
          state: ship.address.state,
          zip: ship.address.postal_code,
          country: ship.address.country || 'US',
          email: (session.customer_details && session.customer_details.email) || '',
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
      },
      carrier_account: process.env.SHIPPO_USPS_ACCOUNT || undefined,
      servicelevel_token: 'usps_ground_advantage',
      label_file_type: 'PDF_4x6',
      async: false,
    }),
  });

  const body = await res.json();
  if (!res.ok || body.status !== 'SUCCESS') {
    const detail = (body.messages || []).map((m) => m.text).join('; ') || body.status || res.status;
    throw new Error(`label purchase failed: ${detail}`);
  }

  return {
    labelPdf: body.label_url,
    tracking: body.tracking_number,
    trackingUrl: body.tracking_url_provider,
    cost: body.rate && body.rate.amount ? `$${body.rate.amount}` : null,
  };
}

/** Tell the customer it is on the way. Stripe does not send this one. */
async function emailTrackingToCustomer({ session, label }) {
  const to = session.customer_details && session.customer_details.email;
  if (!to) return;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#edeeea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edeeea;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbfbf9;border:1px solid #1b2a33;">
  <tr><td style="padding:28px 28px 8px;">
    <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b969d;">Jenna&rsquo;s Jewelry</div>
    <div style="margin-top:10px;font-size:24px;color:#1b2a33;">Your piece is on its way</div>
  </td></tr>
  <tr><td style="padding:8px 28px 24px;font-size:15px;line-height:1.6;color:#56646d;">
    It shipped USPS Ground Advantage today.
    <div style="margin-top:18px;padding:14px;background:#edeeea;border:1px solid #d3d6d0;">
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b969d;">Tracking</div>
      <div style="margin-top:6px;font-family:ui-monospace,Menlo,monospace;font-size:16px;color:#1b2a33;">${escapeHtml(
        label.tracking,
      )}</div>
      ${
        label.trackingUrl
          ? `<a href="${escapeHtml(label.trackingUrl)}" style="display:inline-block;margin-top:12px;color:#8a6d3f;font-size:14px;">Track this package</a>`
          : ''
      }
    </div>
    <p style="margin:22px 0 0;">Thank you for ordering something made by hand.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  await sendMail({ to, subject: 'Your piece has shipped', html });
}

module.exports = {
  signSession,
  verifySession,
  emailOrderToOwner,
  buyLabel,
  emailTrackingToCustomer,
};
