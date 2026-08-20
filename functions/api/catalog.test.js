/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');

const { PRODUCTS } = require('../../shared/catalog.js');
const { priceCart } = require('../../shared/pricing.js');

test('every necklace offers a $3 toggle clasp', () => {
  // Pinned on purpose. A product silently vanishing from the catalog is worth
  // one deliberate test edit to notice. Nine since Jenna retired the Chunky
  // Monogram on 2026-08-03 and added The Ellie, The Abigail, The Faith, and
  // The Bella.
  assert.equal(PRODUCTS.length, 9);

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

test('The Emmy is fixed at 16 inches and does not accept another length', () => {
  const emmy = PRODUCTS.find((product) => product.slug === 'the-emmy');
  assert.ok(emmy);
  assert.equal(emmy.size, '16 inches');
  assert.match(emmy.description, /16 inch/);
  assert.equal(emmy.addOns.some((addOn) => addOn.id === 'length'), false);

  // A saved cart from before the change may still submit an old length. The
  // server drops it, so the work order cannot ask Jenna for an unavailable
  // 18- or 20-inch Emmy.
  const priced = priceCart([
    {
      slug: 'the-emmy',
      qty: 1,
      addOns: [
        { id: 'colour', value: 'Green & Gold' },
        { id: 'length', value: '20 inches' },
      ],
    },
  ]);

  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.lines[0].description, 'Color Ways: Green & Gold');
  assert.ok(priced.dropped.some((message) => message.includes('unknown add-on for the-emmy: length')));
});

test('The Rowan is fixed at 16 inches and does not accept another length', () => {
  const rowan = PRODUCTS.find((product) => product.slug === 'the-rowan');
  assert.ok(rowan);
  assert.equal(rowan.size, '16 inches');
  assert.equal(rowan.addOns.some((addOn) => addOn.id === 'length'), false);

  // A saved cart from before the change may still submit an old length. The
  // server drops it, so the work order cannot ask Jenna for an unavailable
  // 18- or 20-inch Rowan.
  const priced = priceCart([
    {
      slug: 'the-rowan',
      qty: 1,
      addOns: [
        { id: 'colour', value: 'Green' },
        { id: 'length', value: '20 inches' },
      ],
    },
  ]);

  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.lines[0].description, 'Color Ways: Green');
  assert.ok(priced.dropped.some((message) => message.includes('unknown add-on for the-rowan: length')));
});

test('The Abigail is priced from the shared catalog and capped at five total', () => {
  const abigail = PRODUCTS.find((product) => product.slug === 'the-abigail');
  assert.ok(abigail);
  assert.equal(abigail.name, 'The Abigail');
  assert.equal(abigail.priceCents, 4800);
  assert.equal(abigail.weightOz, 2.2);
  assert.equal(abigail.maxPurchaseQuantity, 5);
  assert.equal(abigail.size, '16 inches');
  assert.match(abigail.material, /natural aventurine/);
  assert.match(abigail.material, /mother of pearl/);
  assert.match(abigail.material, /gold shell charm/);

  const priced = priceCart([
    { slug: 'the-abigail', qty: 3, addOns: [] },
    { slug: 'the-abigail', qty: 4, addOns: [] },
  ]);

  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.lines.length, 2);
  assert.deepEqual(
    priced.lines.map((line) => line.qty),
    [3, 2],
  );
  assert.equal(priced.subtotalCents, 24000);
  assert.equal(priced.totalWeightOz, 11);
  assert.ok(priced.dropped.some((message) => message.includes('quantity reduced to 5')));
});

test('The Faith is a fixed 16 inch $45 necklace with a $3 toggle option', () => {
  const faith = PRODUCTS.find((product) => product.slug === 'the-faith');
  assert.ok(faith);
  assert.equal(faith.name, 'The Faith');
  assert.equal(faith.priceCents, 4500);
  assert.equal(faith.weightOz, 2.2);
  assert.equal(faith.size, '16 inches');
  assert.equal(Object.hasOwn(faith, 'material'), false);
  assert.equal(faith.image, 'faith-cross-bust');
  assert.equal(faith.gallery.length, 4);
  assert.equal(faith.addOns.some((addOn) => addOn.id === 'length'), false);

  const toggle = faith.addOns.find((addOn) => addOn.id === 'toggle-clasp');
  assert.ok(toggle);
  assert.equal(toggle.priceCents, 300);

  const priced = priceCart([
    { slug: 'the-faith', qty: 1, addOns: [{ id: 'toggle-clasp' }] },
  ]);

  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.subtotalCents, 4800);
  assert.equal(priced.totalWeightOz, 2.2);
  assert.match(priced.lines[0].description, /Toggle clasp/);
});

test('The Bella is a $40 Afghan serpentine necklace with a $3 toggle option', () => {
  const bella = PRODUCTS.find((product) => product.slug === 'the-bella');
  assert.ok(bella);
  assert.equal(bella.name, 'The Bella');
  assert.equal(bella.priceCents, 4000);
  assert.equal(bella.weightOz, 2.2);
  assert.equal(bella.material, 'Afghan serpentine');
  assert.equal(Object.hasOwn(bella, 'size'), false);
  assert.equal(bella.image, 'bella-serpentine-bust');
  assert.deepEqual(bella.gallery, [
    'bella-serpentine-toggle-flat',
    'bella-serpentine-clasp-detail',
    'bella-serpentine-bead-detail',
  ]);
  assert.equal(bella.addOns.some((addOn) => addOn.id === 'length'), false);

  const toggle = bella.addOns.find((addOn) => addOn.id === 'toggle-clasp');
  assert.ok(toggle);
  assert.equal(toggle.priceCents, 300);

  const priced = priceCart([
    { slug: 'the-bella', qty: 1, addOns: [{ id: 'toggle-clasp' }] },
  ]);

  assert.deepEqual(priced.missingRequired, []);
  assert.equal(priced.subtotalCents, 4300);
  assert.equal(priced.totalWeightOz, 2.2);
  assert.match(priced.lines[0].description, /Toggle clasp/);
});
