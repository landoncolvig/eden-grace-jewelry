/**
 * Bench-ready work-order email for a paid Square shipment.
 *
 * Square owns fulfillment, label purchase, and customer tracking messages.
 * This module gives Jenna the custom specification and a direct path to the
 * Square Shipments queue.
 */

const { sendMail } = require('./mailer.js');
const { formatUSD } = require('./shared/catalog.js');

const JENNA = process.env.OWNER_EMAIL || 'jenna.colvig@gmail.com';
const SQUARE_SHIPMENTS_URL = 'https://app.squareup.com/dashboard/orders/shipments/to-do';

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

function orderEmailHtml({ sale, shipmentsUrl = SQUARE_SHIPMENTS_URL }) {
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
      <div style="font-size:14px;color:#56646d;line-height:1.5;padding-bottom:12px;">This order is waiting in Square under Shipments &gt; To-do. When the piece is finished and boxed, open it there, click Create label, choose USPS Ground Advantage, then confirm and print. Square will mark it shipped and email the customer their tracking details.</div>
      <a href="${escapeHtml(shipmentsUrl)}" style="display:inline-block;background:#1b2a33;color:#edeeea;text-decoration:none;padding:13px 22px;font-size:15px;">Open Square shipments</a>
    </div>
  </td></tr>
  <tr><td style="padding:14px 28px;border-top:1px solid #d3d6d0;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#8b969d;">${escapeHtml(sale.id)}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function emailOrderToOwner({ sale }) {
  const first = sale.lines[0];
  const subject = `New order: ${first ? first.spec || first.description : 'jewelry'} - ${formatUSD(sale.totalCents)}`;
  await sendMail({
    to: JENNA,
    subject,
    html: orderEmailHtml({ sale }),
    replyTo: sale.customer.email || undefined,
  });
}

module.exports = {
  SQUARE_SHIPMENTS_URL,
  orderEmailHtml,
  emailOrderToOwner,
};
