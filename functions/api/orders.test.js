const assert = require('node:assert/strict');
const test = require('node:test');

const { SQUARE_SHIPMENTS_URL, orderEmailHtml } = require('./orders.js');

test('work-order email sends Jenna to Square Shipments', () => {
  const html = orderEmailHtml({
    sale: {
      id: 'ORDER-123',
      totalCents: 5595,
      shippingCents: 795,
      lines: [
        {
          quantity: 1,
          description: 'The Eden',
          spec: 'Colour: Green aventurine / Length: 18 inches',
          totalCents: 4800,
        },
      ],
      customer: { email: 'buyer@example.com', phone: '' },
      shipping: {
        name: 'Taylor Buyer',
        address: {
          line1: '100 Main Street',
          line2: '',
          city: 'Arlington',
          state: 'TX',
          postalCode: '76010',
          country: 'US',
        },
      },
    },
  });

  assert.match(html, new RegExp(SQUARE_SHIPMENTS_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /Create label/);
  assert.doesNotMatch(html, /\/label\?order=/);
});
