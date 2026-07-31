/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');

const { PRODUCTS } = require('../../shared/catalog.js');
const { priceCart } = require('../../shared/pricing.js');

test('every necklace offers a $3 toggle clasp', () => {
  assert.equal(PRODUCTS.length, 6);

  for (const product of PRODUCTS) {
    const clasp = product.addOns.find((addOn) => addOn.id === 'toggle-clasp');
    assert.ok(clasp, `${product.name} is missing the toggle clasp`);
    assert.equal(clasp.label, 'Toggle clasp');
    assert.equal(clasp.priceCents, 300);
  }
});

test('server pricing adds the toggle clasp to the line total and work order', () => {
  const priced = priceCart([
    {
      slug: 'the-eden',
      qty: 1,
      addOns: [
        { id: 'colour', value: 'Green aventurine' },
        { id: 'length', value: '16 inches' },
        { id: 'toggle-clasp' },
      ],
    },
  ]);

  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.subtotalCents, 5100);
  assert.equal(priced.lines[0].unitCents, 5100);
  assert.equal(priced.lines[0].addOns.find((addOn) => addOn.id === 'toggle-clasp').priceCents, 300);
  assert.match(priced.lines[0].description, /Toggle clasp/);
});
