/**
 * Drives the real exported storefront and reports what actually reached
 * dataLayer. gtag.js itself is blocked (the measurement ID is a fake), so the
 * queue is inspected directly, which is what gtag.js would drain.
 */
import pw from '/Users/qb/.claude/skills/playwright-test/node_modules/playwright/index.js';
const { chromium } = pw;

const BASE = 'http://127.0.0.1:4599';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

let gtagRequested = false;
await page.route(/googletagmanager\.com/, (route) => {
  gtagRequested = true;
  route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
});

// Stand in for the Cloud Function so the signup path can be exercised.
let subscribePayload = null;
await page.route('**/subscribe', async (route) => {
  subscribePayload = JSON.parse(route.request().postData() || '{}');
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
});
await page.route('**/shipping-quote', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      cents: 695, chargedCents: 695, free: false,
      service: 'USPS Ground Advantage', estimate: 'about 5 days', fallback: false,
    }),
  }),
);
await page.route('**/create-payment-link', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    // Redirect back to our own success page instead of out to Square.
    body: JSON.stringify({ url: `${BASE}/success/?orderId=ORDER_TEST_123`, orderId: 'ORDER_TEST_123' }),
  }),
);

const dump = () =>
  page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a)));

const step = (label, events) => {
  const names = events.filter((e) => e[0] === 'event').map((e) => e[1]);
  console.log(`\n### ${label}\n  dataLayer: ${names.join(', ') || '(none)'}`);
  return names;
};

const fail = [];
const expect = (cond, msg) => { if (!cond) fail.push(msg); };

// 1. Home
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
let ev = await dump();
expect(ev[0]?.[0] === 'js', 'first dataLayer entry should be js');
expect(ev[1]?.[0] === 'config', 'second dataLayer entry should be config');
expect(ev[1]?.[2]?.send_page_view === false, 'config must disable automatic page_view');
step('home', ev);
expect(ev.some((e) => e[1] === 'page_view'), 'home should send page_view');

// 2. Product page -> view_item
await page.goto(`${BASE}/product/the-eden/`, { waitUntil: 'networkidle' });
ev = await dump();
step('product/the-eden', ev);
const viewItem = ev.find((e) => e[1] === 'view_item');
expect(viewItem, 'product page should send view_item');
console.log('  view_item:', JSON.stringify(viewItem?.[2]));

// 3. Add to cart
await page.getByRole('button', { name: 'Add to cart' }).click();
await page.waitForTimeout(300);
ev = await dump();
step('after add to cart', ev);
const atc = ev.find((e) => e[1] === 'add_to_cart');
expect(atc, 'should send add_to_cart');
console.log('  add_to_cart:', JSON.stringify(atc?.[2]));
expect(atc?.[2]?.value > 0, 'add_to_cart must carry a non-zero value');
expect(atc?.[2]?.items?.[0]?.item_id === 'the-eden', 'add_to_cart item_id should be the slug');

// 4. Cart -> view_cart, add_shipping_info, begin_checkout
await page.goto(`${BASE}/cart/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
ev = await dump();
step('cart', ev);
expect(ev.some((e) => e[1] === 'view_cart'), 'cart should send view_cart');

await page.getByPlaceholder(/\d{5}|ZIP|zip/i).first().fill('76021').catch(() => {});
const zipInput = page.locator('input').filter({ hasNot: page.locator('[type=email]') }).first();
await zipInput.fill('76021');
await page.getByRole('button', { name: /quote|shipping|calculate/i }).first().click();
await page.waitForTimeout(500);
ev = await dump();
step('after shipping quote', ev);
const shipEv = ev.find((e) => e[1] === 'add_shipping_info');
expect(shipEv, 'should send add_shipping_info');
console.log('  add_shipping_info:', JSON.stringify(shipEv?.[2]));

await page.getByRole('button', { name: 'Check out' }).click();
await page.waitForTimeout(1500);
ev = await dump();
step('after checkout redirect', ev);
console.log('  url:', page.url());
const purchase = ev.find((e) => e[1] === 'purchase');
expect(purchase, 'success page should send purchase');
console.log('  purchase:', JSON.stringify(purchase?.[2]));
expect(purchase?.[2]?.transaction_id === 'ORDER_TEST_123', 'purchase needs the Square order id');
expect(purchase?.[2]?.value > 0, 'purchase must carry a non-zero value');
expect(purchase?.[2]?.items?.length > 0, 'purchase must carry line items');

// 5. Reload the success page: purchase must not fire twice.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
ev = await dump();
const purchases = ev.filter((e) => e[1] === 'purchase').length;
console.log(`\n### success page reloaded\n  purchase events on the fresh page: ${purchases}`);
expect(purchases === 0, `purchase re-fired on reload (${purchases})`);

// 6. Email signup
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.locator('#signup-email').fill('verify@example.com');
await page.getByRole('button', { name: 'Join' }).click();
await page.waitForTimeout(600);
ev = await dump();
step('after email signup', ev);
console.log('  POST body:', JSON.stringify(subscribePayload));
expect(subscribePayload?.email === 'verify@example.com', 'signup should POST the address');
expect(subscribePayload?.source === 'footer', 'signup should POST its source');
expect(subscribePayload?.company === '', 'honeypot should be posted empty by a human');
expect(ev.some((e) => e[1] === 'generate_lead'), 'signup should send generate_lead');
const confirmation = await page.getByText(/on the list/i).count();
expect(confirmation > 0, 'signup should show a confirmation');

console.log(`\ngtag.js requested: ${gtagRequested}`);
expect(gtagRequested, 'gtag.js should have been requested');

console.log(fail.length ? `\nFAILURES:\n - ${fail.join('\n - ')}` : '\nALL CHECKS PASSED');
await browser.close();
process.exit(fail.length ? 1 : 0);
