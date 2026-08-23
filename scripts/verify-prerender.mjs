/**
 * Asserts that every exported page is readable without running JavaScript.
 *
 * This exists because it silently was not. The product page wrapped the whole
 * body in a <Suspense> whose child called useSearchParams(), which opts the
 * boundary out of the static prerender, so `next build` wrote the empty
 * fallback into out/product/<slug>/index.html. The pages looked perfect in a
 * browser, the build passed, and Google indexed zero of the nine over a month
 * because everything it fetched was an empty div.
 *
 * A browser cannot catch that; it runs the JavaScript. So this reads the built
 * HTML as a crawler does, as bytes.
 *
 *     node scripts/verify-prerender.mjs          # after `next build`
 *
 * Exits non-zero on the first page that fails, so it can gate a deploy.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'out');
const { PRODUCTS, formatUSD } = require(path.join(ROOT, 'shared', 'catalog.js'));

/** Strip <script> bodies. A measurement ID or an RSC payload is not content. */
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '');

const failures = [];

async function page(route) {
  const file = path.join(OUT, route, 'index.html');
  try {
    return await readFile(file, 'utf8');
  } catch {
    failures.push(`${route || '/'}: not built (${path.relative(ROOT, file)})`);
    return null;
  }
}

function check(route, html, label, ok) {
  if (!ok) failures.push(`${route || '/'}: ${label}`);
}

for (const product of PRODUCTS) {
  const route = `product/${product.slug}`;
  const html = await page(route);
  if (!html) continue;
  const body = visible(html);

  // The four things a crawler and a link scraper need, and the four things
  // that were missing.
  check(route, html, 'no <h1>', /<h1[\s>]/i.test(body));
  check(route, html, `<h1> does not name "${product.name}"`,
    new RegExp(`<h1[^>]*>[\\s\\S]{0,200}?${product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(body));
  check(route, html, 'no <img>', /<img[\s>]/i.test(body));
  check(route, html, 'no alt text on any <img>', /<img[^>]+alt="[^"]+"/i.test(body));
  check(route, html, `price ${formatUSD(product.priceCents)} not in HTML`,
    body.includes(formatUSD(product.priceCents)));
  check(route, html, 'description not in HTML',
    body.includes(product.description.slice(0, 40)));

  // The tags that decide what a share card looks like and what Google shows.
  check(route, html, 'no og:image', /property="og:image"/i.test(html));
  check(route, html, 'og:image is a WebP (scrapers will not render it)',
    !/property="og:image"[^>]*content="[^"]+\.webp"/i.test(html));
  check(route, html, 'twitter:card is not summary_large_image',
    /name="twitter:card" content="summary_large_image"/i.test(html));
  check(route, html, 'no canonical', /rel="canonical"/i.test(html));
  check(route, html, 'no Product JSON-LD',
    /application\/ld\+json/i.test(html) && /"@type":"Product"/.test(html));
  check(route, html, 'JSON-LD price does not match the catalog',
    new RegExp(`"price":"${(product.priceCents / 100).toFixed(2)}"`).test(html));
}

for (const [route, needles] of [
  ['', ['og:image', 'rel="canonical"', '"@type":"Organization"', 'signup-email-home']],
  ['about', ['og:image', 'rel="canonical"']],
]) {
  const html = await page(route);
  if (!html) continue;
  for (const needle of needles) {
    check(route, html, `missing ${needle}`, html.includes(needle));
  }
}

if (failures.length) {
  console.error(`\nPrerender check FAILED (${failures.length}):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('');
  process.exit(1);
}

console.log(`Prerender check passed: ${PRODUCTS.length} product pages, home, about.`);
