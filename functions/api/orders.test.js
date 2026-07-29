const assert = require('node:assert/strict');
const test = require('node:test');

const { signOrder, verifyOrder } = require('./orders.js');

test('label links are bound to one Square order', () => {
  process.env.LABEL_SIGNING_KEY = 'test-label-key';
  const token = signOrder('ORDER-123');
  assert.equal(verifyOrder('ORDER-123', token), true);
  assert.equal(verifyOrder('ORDER-456', token), false);
  assert.equal(verifyOrder('ORDER-123', `${token}x`), false);
});
