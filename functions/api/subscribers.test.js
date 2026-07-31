const assert = require('node:assert/strict');
const test = require('node:test');

const { subscribe, recordBuyer, SubscribeError } = require('./subscribers.js');

/**
 * Square is stubbed at fetch, one level below the client module, so these
 * tests cover the request the function actually puts on the wire rather than
 * a mock of our own helper.
 */
function stubSquare(handler) {
  const calls = [];
  const original = global.fetch;

  global.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    const call = { url: String(url), method: init.method || 'GET', body };
    calls.push(call);

    const result = handler(call);
    return {
      ok: result.ok !== false,
      status: result.status || 200,
      text: async () => JSON.stringify(result.payload ?? {}),
    };
  };

  return {
    calls,
    restore() {
      global.fetch = original;
    },
  };
}

const GROUPS = { groups: [{ id: 'GRP1', name: 'Website signups' }] };

/** Each test gets a fresh IP so the shared rate limiter does not leak across. */
let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

test.before(() => {
  process.env.SQUARE_ACCESS_TOKEN = 'test-token';
});

test('a new address is created in Square and added to the signup group', async () => {
  const square = stubSquare((call) => {
    if (call.url.endsWith('/customers/search')) return { payload: {} };
    if (call.url.endsWith('/customers/groups')) return { payload: GROUPS };
    if (call.url.endsWith('/customers')) {
      return { payload: { customer: { id: 'CUST1' } } };
    }
    return { payload: {} };
  });

  try {
    const result = await subscribe({ email: 'Buyer@Example.COM', ip: nextIp() });
    assert.deepEqual(result, { ok: true, created: true });

    const created = square.calls.find((c) => c.method === 'POST' && c.url.endsWith('/customers'));
    assert.equal(created.body.email_address, 'buyer@example.com', 'address is normalised');
    assert.equal(created.body.reference_id, 'signup:footer');

    const grouped = square.calls.find((c) => c.method === 'PUT');
    assert.ok(
      grouped.url.endsWith('/customers/CUST1/groups/GRP1'),
      `expected the group PUT, got ${grouped && grouped.url}`,
    );
  } finally {
    square.restore();
  }
});

test('an address already in the directory is grouped, not duplicated', async () => {
  const square = stubSquare((call) => {
    if (call.url.endsWith('/customers/search')) {
      return { payload: { customers: [{ id: 'CUST9' }] } };
    }
    if (call.url.endsWith('/customers/groups')) return { payload: GROUPS };
    return { payload: {} };
  });

  try {
    const result = await subscribe({ email: 'past@buyer.com', ip: nextIp() });
    assert.deepEqual(result, { ok: true, created: false });

    const created = square.calls.find((c) => c.method === 'POST' && c.url.endsWith('/customers'));
    assert.equal(created, undefined, 'must not create a second customer record');
  } finally {
    square.restore();
  }
});

test('a honeypot submission never reaches Square', async () => {
  const square = stubSquare(() => ({ payload: {} }));
  try {
    const result = await subscribe({
      email: 'bot@spam.com',
      honeypot: 'Acme Inc',
      ip: nextIp(),
    });
    assert.equal(result.skipped, 'honeypot');
    assert.equal(square.calls.length, 0);
  } finally {
    square.restore();
  }
});

test('a malformed address is rejected before Square is called', async () => {
  const square = stubSquare(() => ({ payload: {} }));
  try {
    for (const bad of ['', 'not-an-email', 'no@tld', 'two words@example.com']) {
      await assert.rejects(
        () => subscribe({ email: bad, ip: nextIp() }),
        (err) => err instanceof SubscribeError && err.status === 400,
        `expected ${JSON.stringify(bad)} to be rejected`,
      );
    }
    assert.equal(square.calls.length, 0);
  } finally {
    square.restore();
  }
});

test('the rate limiter cuts one address off after five tries', async () => {
  const square = stubSquare((call) => {
    if (call.url.endsWith('/customers/search')) {
      return { payload: { customers: [{ id: 'CUST9' }] } };
    }
    if (call.url.endsWith('/customers/groups')) return { payload: GROUPS };
    return { payload: {} };
  });

  const ip = nextIp();
  try {
    for (let i = 0; i < 5; i += 1) {
      await subscribe({ email: `a${i}@example.com`, ip });
    }
    await assert.rejects(
      () => subscribe({ email: 'six@example.com', ip }),
      (err) => err instanceof SubscribeError && err.status === 429,
    );
  } finally {
    square.restore();
  }
});

test('a group failure still reports success, because the address was saved', async () => {
  const square = stubSquare((call) => {
    if (call.url.endsWith('/customers/search')) return { payload: {} };
    if (call.url.endsWith('/customers/groups')) {
      return { ok: false, status: 500, payload: { errors: [{ detail: 'Square is down' }] } };
    }
    if (call.url.endsWith('/customers')) return { payload: { customer: { id: 'CUST2' } } };
    return { payload: {} };
  });

  try {
    const result = await subscribe({ email: 'grouped@example.com', ip: nextIp() });
    assert.equal(result.ok, true);
    assert.equal(result.created, true);
  } finally {
    square.restore();
  }
});

test('recordBuyer saves a buyer without putting them on the marketing list', async () => {
  const square = stubSquare((call) => {
    if (call.url.endsWith('/customers/search')) return { payload: {} };
    if (call.url.endsWith('/customers')) return { payload: { customer: { id: 'CUST3' } } };
    return { payload: {} };
  });

  try {
    const result = await recordBuyer('shopper@example.com');
    assert.deepEqual(result, { ok: true, created: true });

    const created = square.calls.find((c) => c.method === 'POST' && c.url.endsWith('/customers'));
    assert.equal(created.body.reference_id, 'buyer:website');
    assert.equal(
      square.calls.find((c) => c.method === 'PUT'),
      undefined,
      'paying for something is not consent to be marketed to',
    );
  } finally {
    square.restore();
  }
});

test('recordBuyer does nothing when Square gave us no email', async () => {
  const square = stubSquare(() => ({ payload: {} }));
  try {
    const result = await recordBuyer('');
    assert.equal(result.ok, false);
    assert.equal(square.calls.length, 0);
  } finally {
    square.restore();
  }
});
