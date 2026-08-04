const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  buildPaymentLinkPayload,
  verifyWebhookSignature,
  normalizeSquareSale,
} = require('./square.js');

test('buildPaymentLinkPayload uses server-priced items and a USPS fee', () => {
  const payload = buildPaymentLinkPayload({
    priced: {
      totalWeightOz: 3.5,
      lines: [
        {
          name: 'The Eden',
          qty: 2,
          unitCents: 5600,
          description: 'Color: Green aventurine / Length: 18 inches',
        },
      ],
    },
    rate: { service: 'USPS Ground Advantage', fallback: false },
    shipping: { chargedCents: 695 },
    zip: '76021',
    siteUrl: 'https://edengracejewelry.com/',
    locationId: 'LOCATION',
    idempotencyKey: '12345678-1234-1234-1234-123456789abc',
  });

  assert.equal(payload.order.location_id, 'LOCATION');
  assert.equal(payload.order.line_items[0].quantity, '2');
  assert.equal(payload.order.line_items[0].base_price_money.amount, 5600);
  assert.equal(payload.checkout_options.ask_for_shipping_address, true);
  assert.equal(payload.checkout_options.shipping_fee.charge.amount, 695);
  assert.equal(payload.checkout_options.redirect_url, 'https://edengracejewelry.com/success/');
  assert.equal(payload.order.metadata.shipping_quote, '76021|695|live');
});

test('buildPaymentLinkPayload omits a zero shipping fee', () => {
  const payload = buildPaymentLinkPayload({
    priced: { totalWeightOz: 2, lines: [{ name: 'The Eden', qty: 1, unitCents: 4800, description: 'Spec' }] },
    rate: { service: 'USPS Ground Advantage', fallback: false },
    shipping: { chargedCents: 0 },
    zip: '76021',
    siteUrl: 'https://edengracejewelry.com',
    locationId: 'LOCATION',
  });

  assert.equal('shipping_fee' in payload.checkout_options, false);
});

test('verifyWebhookSignature accepts only Square’s exact URL and raw body', () => {
  const signatureKey = 'test-signature-key';
  const notificationUrl = 'https://example.test/webhook';
  const raw = '{"type":"payment.updated"}';
  const signature = crypto
    .createHmac('sha256', signatureKey)
    .update(`${notificationUrl}${raw}`)
    .digest('base64');

  assert.equal(verifyWebhookSignature(Buffer.from(raw), signature, { signatureKey, notificationUrl }), true);
  assert.equal(verifyWebhookSignature(Buffer.from(`${raw} `), signature, { signatureKey, notificationUrl }), false);
});

test('normalizeSquareSale maps paid Square shipping details into a work order', () => {
  const sale = normalizeSquareSale(
    {
      id: 'ORDER',
      reference_id: 'egj_123',
      total_money: { amount: 5495, currency: 'USD' },
      metadata: { storefront: 'edengracejewelry.com', weight_oz: '3.2' },
      line_items: [
        {
          name: 'The Eden',
          quantity: '1',
          note: 'Color: Green aventurine / Length: 18 inches',
          total_money: { amount: 4800, currency: 'USD' },
        },
      ],
      service_charges: [{ total_money: { amount: 695, currency: 'USD' } }],
      fulfillments: [
        {
          type: 'SHIPMENT',
          shipment_details: {
            recipient: {
              display_name: 'Taylor Buyer',
              phone_number: '5555555555',
              address: {
                address_line_1: '100 Main Street',
                locality: 'Arlington',
                administrative_district_level_1: 'TX',
                postal_code: '76010',
                country: 'US',
              },
            },
          },
        },
      ],
    },
    {
      total_money: { amount: 5495, currency: 'USD' },
      buyer_email_address: 'taylor@example.com',
      shipping_address: {
        address_line_1: '100 Main Street',
        locality: 'Arlington',
        administrative_district_level_1: 'TX',
        postal_code: '76010',
        country: 'US',
      },
    },
  );

  assert.equal(sale.totalCents, 5495);
  assert.equal(sale.shippingCents, 695);
  assert.equal(sale.shipping.name, 'Taylor Buyer');
  assert.equal(sale.shipping.address.postalCode, '76010');
  assert.equal(sale.customer.email, 'taylor@example.com');
  assert.equal(sale.lines[0].spec, 'Color: Green aventurine / Length: 18 inches');
});
