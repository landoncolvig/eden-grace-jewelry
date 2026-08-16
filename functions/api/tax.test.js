const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TEXAS_SALES_TAX_RATE_PERCENT,
  isTexasZip,
  calculateTexasSalesTaxCents,
  salesTaxFor,
} = require('./shared/tax.js');

test('Texas ZIP ranges are taxed and out-of-state ZIPs are not', () => {
  assert.equal(isTexasZip('76021'), true);
  assert.equal(isTexasZip('73301'), true);
  assert.equal(isTexasZip('88510'), true);
  assert.equal(isTexasZip('10001'), false);
  assert.equal(isTexasZip('73949'), false);
  assert.equal(isTexasZip('nope'), false);
});

test('Texas tax is 8.25% of merchandise plus taxable shipping', () => {
  assert.equal(TEXAS_SALES_TAX_RATE_PERCENT, '8.25');
  assert.equal(calculateTexasSalesTaxCents(4800, 695, '76021'), 453);
  assert.equal(calculateTexasSalesTaxCents(4800, 0, '76021'), 396);
  assert.equal(calculateTexasSalesTaxCents(4800, 695, '10001'), 0);
});

test('salesTaxFor returns the Square-ready rate only for Texas', () => {
  assert.deepEqual(salesTaxFor({ subtotalCents: 4800, shippingCents: 695, zip: '76021' }), {
    applies: true,
    ratePercent: '8.25',
    cents: 453,
  });
  assert.deepEqual(salesTaxFor({ subtotalCents: 4800, shippingCents: 695, zip: '10001' }), {
    applies: false,
    ratePercent: null,
    cents: 0,
  });
});
