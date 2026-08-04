import pw from '/Users/qb/.claude/skills/playwright-test/node_modules/playwright/index.js';
const { chromium } = pw;
const b = await chromium.launch();

// Read the config gtag was actually initialised with. That is what decides
// whether tt=internal goes on every hit, and it does not race GA's batching.
async function cfg(url, ctx) {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const c = (window.dataLayer || []).map(a => Array.from(a)).find(a => a[0] === 'config');
    return { traffic: c && c[2] ? (c[2].traffic_type || 'absent') : 'no config',
             flag: window.localStorage.getItem('eg.traffic.internal.v1') };
  });
  await p.close();
  return r;
}

const fail = [];
const chk = (label, got, want) => {
  console.log(`${label.padEnd(26)} traffic_type=${String(got.traffic).padEnd(9)} flag=${got.flag}`);
  if (got.traffic !== want) fail.push(`${label}: expected ${want}, got ${got.traffic}`);
};

const A = await b.newContext();
chk('normal visitor', await cfg('http://127.0.0.1:4599/', A), 'absent');

const B = await b.newContext();
chk('opt in ?eg_internal=1', await cfg('http://127.0.0.1:4599/?eg_internal=1', B), 'internal');
chk('later page same browser', await cfg('http://127.0.0.1:4599/product/the-blair/', B), 'internal');
chk('opt out ?eg_internal=0', await cfg('http://127.0.0.1:4599/?eg_internal=0', B), 'absent');
chk('plain visit after undo', await cfg('http://127.0.0.1:4599/', B), 'absent');

// And confirm the opted-in case really puts tt=internal on the wire.
const C = await b.newContext();
const p = await C.newPage();
let onWire = 'none';
p.on('request', r => { if (r.url().includes('/g/collect')) onWire = new URL(r.url()).searchParams.get('tt') || 'absent'; });
await p.goto('http://127.0.0.1:4599/?eg_internal=1', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
console.log(`\non the wire (opted in)     tt=${onWire}`);
if (onWire !== 'internal') fail.push('tt=internal not sent on the wire');

console.log(fail.length ? '\nFAILURES:\n - ' + fail.join('\n - ') : '\nALL CHECKS PASSED');
await b.close();
process.exit(fail.length ? 1 : 0);
