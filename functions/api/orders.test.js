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
          spec: 'Color: Green aventurine / Length: 18 inches',
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

test('the order subject names the piece, not its options', () => {
  const { orderSubject } = require('./orders.js');

  // Regression: this used to prefer the spec, so no subject ever named the
  // necklace. Jenna could not tell from her inbox what had been ordered.
  assert.equal(
    orderSubject({
      totalCents: 5317,
      lines: [{ quantity: 1, description: 'The Eden', spec: 'Color Ways: Navy & Cream / Length: 16 inches' }],
    }),
    'New order: The Eden - $53.17',
  );

  assert.equal(
    orderSubject({ totalCents: 9600, lines: [{ quantity: 2, description: 'The Emmy', spec: 'x' }] }),
    'New order: 2x The Emmy - $96.00',
  );

  assert.equal(
    orderSubject({
      totalCents: 12000,
      lines: [{ quantity: 1, description: 'The Blair', spec: '' }, { quantity: 1, description: 'The Rowan', spec: '' }],
    }),
    'New order: The Blair +1 more - $120.00',
  );
});
