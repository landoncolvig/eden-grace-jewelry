/**
 * Email capture.
 *
 * A visitor who does not buy leaves nothing behind, so the storefront has one
 * signup field and it lands here. Addresses go into the Square customer
 * directory, tagged into a group, which is what Square Marketing sends to.
 * That keeps signups and buyers in one list rather than in two places that
 * have to be reconciled by hand later.
 */

const {
  SquareApiError,
  findCustomerByEmail,
  createCustomer,
  listCustomerGroups,
  createCustomerGroup,
  addCustomerToGroup,
} = require('./square.js');

/** Shown in Square Dashboard > Customers > Groups. */
const GROUP_NAME = 'Website signups';

/**
 * Deliberately permissive. This is a delivery decision, not an identity
 * check, and a regex strict enough to be interesting rejects real addresses.
 * Square rejects genuinely malformed values, and a typo'd address just bounces.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

/** Free text that ends up on the customer record, so keep the set closed. */
const SOURCES = new Set(['footer', 'homepage', 'product', 'cart']);

class SubscribeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'SubscribeError';
    this.status = status;
  }
}

/* ------------------------------------------------------------------ *
 * Rate limiting
 *
 * Per instance and in memory, which a determined attacker spreads across
 * instances to defeat. It is here to stop a script pointed at the endpoint
 * from filling Jenna's directory with junk, and for that it is enough. The
 * real cost of a flood is Square API quota, and Square rate limits too.
 * ------------------------------------------------------------------ */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();

  // Sweep on write. There is no timer in a function that scales to zero, and
  // an unbounded Map in a warm instance is a slow leak.
  for (const [key, times] of hits) {
    const live = times.filter((t) => now - t < WINDOW_MS);
    if (live.length) hits.set(key, live);
    else hits.delete(key);
  }

  const times = hits.get(ip) || [];
  if (times.length >= MAX_PER_WINDOW) return true;
  hits.set(ip, [...times, now]);
  return false;
}

/** Cached for the life of the instance; the group id never changes. */
let groupIdPromise = null;

async function signupGroupId() {
  if (!groupIdPromise) {
    groupIdPromise = (async () => {
      const groups = await listCustomerGroups();
      const existing = groups.find((g) => g.name === GROUP_NAME);
      if (existing) return existing.id;
      const created = await createCustomerGroup(GROUP_NAME);
      return created.id;
    })().catch((err) => {
      // Do not cache a failure. A transient Square error would otherwise mean
      // every later signup on this instance skips the group too.
      groupIdPromise = null;
      throw err;
    });
  }
  return groupIdPromise;
}

/**
 * Adds an address to the directory and the signup group.
 *
 * An address that is already in the directory (a past buyer, or someone who
 * signed up twice) is added to the group and reported as success. Telling a
 * visitor "you are already subscribed" discloses who is on the list to
 * anyone who can type an address into the form.
 */
async function subscribe({ email, source = 'footer', honeypot = '', ip = 'unknown' }) {
  // A hidden field that only a bot fills. Answer as though it worked, so a
  // scripted signer-upper gets no signal about what tripped it.
  if (String(honeypot).trim()) return { ok: true, skipped: 'honeypot' };

  const clean = String(email || '').trim().toLowerCase();
  if (!clean || clean.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(clean)) {
    throw new SubscribeError('That does not look like an email address.');
  }
  if (!SOURCES.has(source)) source = 'footer';

  if (rateLimited(ip)) {
    throw new SubscribeError('Too many signups from here. Try again later.', 429);
  }

  let customer = await findCustomerByEmail(clean);
  let created = false;

  if (!customer) {
    customer = await createCustomer({
      email: clean,
      referenceId: `signup:${source}`,
      note: `Signed up on edengracejewelry.com (${source})`,
    });
    created = true;
  }

  try {
    await addCustomerToGroup(customer.id, await signupGroupId());
  } catch (err) {
    // The address is already saved, which is the part that cannot be redone
    // from a log line. Failing the request here would make the visitor retry
    // and see an error for something that worked.
    console.error('could not add subscriber to group', {
      customerId: customer.id,
      error: err.message,
    });
  }

  return { ok: true, created };
}

/**
 * Makes sure a paying buyer exists in the customer directory.
 *
 * Square's hosted checkout attaches a customer to the order in most cases,
 * but not in every one, and a buyer who paid and is not in the directory is a
 * customer Jenna cannot reach about their own order. This closes that gap.
 *
 * The buyer is NOT added to the signup group. Handing over an address to
 * complete a purchase is not consent to be marketed to, and Square's checkout
 * collects that opt-in separately.
 */
async function recordBuyer(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean || !EMAIL_RE.test(clean)) return { ok: false, reason: 'no usable email' };

  const existing = await findCustomerByEmail(clean);
  if (existing) return { ok: true, created: false };

  await createCustomer({
    email: clean,
    referenceId: 'buyer:website',
    note: 'Bought on edengracejewelry.com',
  });
  return { ok: true, created: true };
}

module.exports = { subscribe, recordBuyer, SubscribeError, GROUP_NAME, EMAIL_RE, SquareApiError };
