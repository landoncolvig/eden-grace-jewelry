/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');

const { PRODUCTS } = require('../../shared/catalog.js');
const { priceCart } = require('../../shared/pricing.js');

test('every necklace offers a $3 toggle clasp', () => {
  // Pinned on purpose. A product silently vanishing from the catalog is worth
  // one deliberate test edit to notice. Six since Jenna retired the Chunky
  // Monogram on 2026-08-03 and added The Ellie on 2026-08-09.
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
        { id: 'colour', value: 'Navy & Cream' },
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

test('The Eden offers a $3 horseshoe charm priced by the server', () => {
  const eden = PRODUCTS.find((product) => product.slug === 'the-eden');
  const charm = eden.addOns.find((addOn) => addOn.id === 'horseshoe-charm');

  assert.ok(charm);
  assert.equal(charm.label, 'Horseshoe charm');
  assert.equal(charm.priceCents, 300);
  assert.deepEqual(
    PRODUCTS.filter((product) => product.addOns.some((addOn) => addOn.id === 'horseshoe-charm')).map(
      (product) => product.slug,
    ),
    ['the-eden'],
  );

  const priced = priceCart([
    {
      slug: 'the-eden',
      qty: 1,
      addOns: [
        { id: 'colour', value: 'Brown & Cream' },
        { id: 'length', value: '18 inches' },
        { id: 'horseshoe-charm' },
      ],
    },
  ]);

  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.subtotalCents, 5100);
  assert.equal(priced.lines[0].unitCents, 5100);
  assert.equal(priced.lines[0].addOns.find((addOn) => addOn.id === 'horseshoe-charm').priceCents, 300);
  assert.match(priced.lines[0].description, /Horseshoe charm/);
});

test('The Ellie is priced from the shared server catalog', () => {
  const ellie = PRODUCTS.find((product) => product.slug === 'the-ellie');
  assert.ok(ellie);
  assert.equal(ellie.name, 'The Ellie');
  assert.equal(ellie.priceCents, 5000);
  assert.equal(ellie.weightOz, 4);
  assert.match(ellie.description, /18 inch/);
  assert.match(ellie.description, /mother of pearl/);
  assert.match(ellie.description, /14k gold charms/);

  const priced = priceCart([{ slug: 'the-ellie', qty: 1, addOns: [] }]);
  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.subtotalCents, 5000);
  assert.equal(priced.totalWeightOz, 4);
  assert.equal(priced.lines[0].unitCents, 5000);
});
