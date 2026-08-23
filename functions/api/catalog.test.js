/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');

const { PRODUCTS } = require('../../shared/catalog.js');
const { priceCart } = require('../../shared/pricing.js');

test('every necklace except The Capri and The Emmy offers a $3 toggle clasp', () => {
  // Pinned on purpose. A product silently vanishing from the catalog is worth
  // one deliberate test edit to notice. Ten since Jenna retired the Chunky
  // Monogram on 2026-08-03 and added The Ellie, The Abigail, The Faith, The
  // Bella, and The Capri.
  assert.equal(PRODUCTS.length, 10);

  for (const product of PRODUCTS) {
    const clasp = product.addOns.find((addOn) => addOn.id === 'toggle-clasp');
    if (product.slug === 'the-capri' || product.slug === 'the-emmy') {
      assert.equal(clasp, undefined);
      continue;
    }
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

test('The Ellie has three required colors and keeps its existing price and clasp option', () => {
  const ellie = PRODUCTS.find((product) => product.slug === 'the-ellie');
  assert.ok(ellie);
  assert.equal(ellie.name, 'The Ellie');
  assert.equal(ellie.priceCents, 5000);
  assert.equal(ellie.weightOz, 4);
  assert.match(ellie.description, /18 inch/);
  assert.match(ellie.description, /mother of pearl/);
  assert.match(ellie.description, /14k gold charms/);
  assert.equal(ellie.image, 'ellie-translucent-white-bust');
  assert.equal(ellie.gallery.length, 14);

  const color = ellie.addOns.find((addOn) => addOn.id === 'colour');
  assert.ok(color);
  assert.equal(color.required, true);
  assert.deepEqual(color.choices, ['Purple', 'Neutral Pink', 'Translucent White']);

  const clasp = ellie.addOns.find((addOn) => addOn.id === 'toggle-clasp');
  assert.ok(clasp);
  assert.equal(clasp.priceCents, 300);

  for (const choice of color.choices) {
    const priced = priceCart([
      { slug: 'the-ellie', qty: 1, addOns: [{ id: 'colour', value: choice }] },
    ]);
    assert.deepEqual(priced.missingRequired, []);
    assert.equal(priced.subtotalCents, 5000);
    assert.equal(priced.totalWeightOz, 4);
    assert.equal(priced.lines[0].unitCents, 5000);
    assert.match(priced.lines[0].description, new RegExp(`Color Ways: ${choice}`));
  }

  const missingColor = priceCart([{ slug: 'the-ellie', qty: 1, addOns: [] }]);
  assert.equal(missingColor.missingRequired.length, 1);

  const retiredColor = priceCart([
    { slug: 'the-ellie', qty: 1, addOns: [{ id: 'colour', value: 'Blue Gray' }] },
  ]);
  assert.equal(retiredColor.missingRequired.length, 1);
  assert.ok(retiredColor.dropped.some((message) => message.includes('invalid colour for the-ellie')));
});

test('The Emmy is fixed at 16 inches with two colors and an optional clover charm', () => {
  const emmy = PRODUCTS.find((product) => product.slug === 'the-emmy');
  assert.ok(emmy);
  assert.equal(emmy.size, '16 inches');
  assert.match(emmy.description, /16 inch/);
  assert.equal(emmy.image, 'emmy-green-bust');
  assert.equal(emmy.gallery.length, 9);
  assert.equal(emmy.addOns.some((addOn) => addOn.id === 'length'), false);
  assert.equal(emmy.addOns.some((addOn) => addOn.id === 'toggle-clasp'), false);

  const color = emmy.addOns.find((addOn) => addOn.id === 'colour');
  assert.ok(color);
  assert.equal(color.required, true);
  assert.deepEqual(color.choices, ['Green', 'Neutral Purple']);

  const charm = emmy.addOns.find((addOn) => addOn.id === 'clover-charm');
  assert.ok(charm);
  assert.equal(charm.label, '18k gold-plated clover charm');
  assert.equal(charm.priceCents, 300);

  // Saved carts can still submit retired lengths and toggles. The server drops
  // both so Jenna receives only the currently offered Emmy configuration.
  const green = priceCart([
    {
      slug: 'the-emmy',
      qty: 1,
      addOns: [
        { id: 'colour', value: 'Green' },
        { id: 'length', value: '20 inches' },
        { id: 'toggle-clasp' },
      ],
    },
  ]);

  assert.deepEqual(green.missingRequired, []);
  assert.equal(green.subtotalCents, 4500);
  assert.equal(green.lines[0].description, 'Color Ways: Green');
  assert.ok(green.dropped.some((message) => message.includes('unknown add-on for the-emmy: length')));
  assert.ok(green.dropped.some((message) => message.includes('unknown add-on for the-emmy: toggle-clasp')));

  const neutralPurple = priceCart([
    {
      slug: 'the-emmy',
      qty: 1,
      addOns: [
        { id: 'colour', value: 'Neutral Purple' },
        { id: 'clover-charm' },
      ],
    },
  ]);
  assert.deepEqual(neutralPurple.missingRequired, []);
  assert.equal(neutralPurple.subtotalCents, 4800);
  assert.match(neutralPurple.lines[0].description, /Color Ways: Neutral Purple/);
  assert.match(neutralPurple.lines[0].description, /18k gold-plated clover charm/);

  // A retired color must be chosen again rather than reaching the work order.
  const retiredColor = priceCart([
    { slug: 'the-emmy', qty: 1, addOns: [{ id: 'colour', value: 'Green & Gold' }] },
  ]);
  assert.equal(retiredColor.missingRequired.length, 1);
  assert.ok(retiredColor.dropped.some((message) => message.includes('invalid colour for the-emmy')));
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

test('The Capri is $40, requires blue or pink, and has no toggle option', () => {
  const capri = PRODUCTS.find((product) => product.slug === 'the-capri');
  assert.ok(capri);
  assert.equal(capri.name, 'The Capri');
  assert.equal(capri.priceCents, 4000);
  assert.equal(capri.weightOz, 2.2);
  assert.equal(Object.hasOwn(capri, 'material'), false);
  assert.equal(Object.hasOwn(capri, 'size'), false);
  assert.equal(capri.image, 'capri-blue-bust');
  assert.equal(capri.gallery.length, 8);
  assert.equal(capri.addOns.some((addOn) => addOn.id === 'length'), false);
  assert.equal(capri.addOns.some((addOn) => addOn.id === 'toggle-clasp'), false);

  const color = capri.addOns.find((addOn) => addOn.id === 'colour');
  assert.ok(color);
  assert.equal(color.required, true);
  assert.deepEqual(color.choices, ['Blue', 'Pink']);

  const missing = priceCart([{ slug: 'the-capri', qty: 1, addOns: [] }]);
  assert.equal(missing.missingRequired.length, 1);
  assert.match(missing.missingRequired[0], /color ways/);

  // A stale or edited cart cannot add the clasp back; the server drops it.
  const blue = priceCart([
    {
      slug: 'the-capri',
      qty: 1,
      addOns: [
        { id: 'colour', value: 'Blue' },
        { id: 'toggle-clasp' },
      ],
    },
  ]);
  assert.deepEqual(blue.missingRequired, []);
  assert.equal(blue.subtotalCents, 4000);
  assert.equal(blue.totalWeightOz, 2.2);
  assert.match(blue.lines[0].description, /Color Ways: Blue/);
  assert.doesNotMatch(blue.lines[0].description, /Toggle clasp/);
  assert.ok(blue.dropped.some((message) => message.includes('unknown add-on for the-capri: toggle-clasp')));

  const pink = priceCart([
    { slug: 'the-capri', qty: 1, addOns: [{ id: 'colour', value: 'Pink' }] },
  ]);
  assert.deepEqual(pink.missingRequired, []);
  assert.equal(pink.subtotalCents, 4000);
  assert.match(pink.lines[0].description, /Color Ways: Pink/);
});
