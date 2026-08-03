import pw from '/Users/qb/.claude/skills/playwright-test/node_modules/playwright/index.js';
const { chromium } = pw;
const b = await chromium.launch(); const p = await b.newPage();
const fail = [];
const expect = (c,m) => { if(!c) fail.push(m); };

const expected = {
  'the-eden':              { price:'$48.00', ways:['Navy & Cream','Brown & Cream'], length:true,  material:true },
  'the-rowan':             { price:'$40.00', ways:['Royal Blue','Brown','Yellow','Green','Pink'], length:true, material:false },
  'the-emmy':              { price:'$45.00', ways:['Green & Gold','Navy Blue & Purple','Light Pink','Brown & Cream'], length:true, material:true },
  'the-blair':             { price:'$78.00', ways:[], length:false, material:true },
  'the-delicate-monogram': { price:'$35.00', ways:['Light Blue','Pink','Purple','Yellow','Dark Blue'], length:false, material:false },
};

for (const [slug, e] of Object.entries(expected)) {
  await p.goto(`http://127.0.0.1:4599/product/${slug}/`, { waitUntil:'networkidle' });
  await p.waitForTimeout(500);
  const body = await p.evaluate(() => document.body.innerText);
  const buttons = await p.locator('button').allTextContents();

  const hasMaterial = /\bMaterial\b/.test(body);
  const hasLength   = /\bLength\b/.test(body);
  const hasWays     = /Color Ways/.test(body);
  const hasAccents  = /Pearl and gold accent/.test(body);

  expect(body.includes(e.price), `${slug}: price ${e.price} not shown`);
  expect(hasMaterial === e.material, `${slug}: material row should be ${e.material}, got ${hasMaterial}`);
  expect(hasLength === e.length, `${slug}: length picker should be ${e.length}, got ${hasLength}`);
  expect(hasWays === (e.ways.length>0), `${slug}: Color Ways should be ${e.ways.length>0}, got ${hasWays}`);
  expect(!hasAccents, `${slug}: accent bead add-on still present`);
  for (const w of e.ways) expect(buttons.some(b=>b.trim()===w), `${slug}: missing colour way "${w}"`);

  console.log(`${slug.padEnd(24)} price=${e.price} ways=${e.ways.length} length=${hasLength} material=${hasMaterial}`);
}

// The retired product must 404, not render.
const r = await p.goto('http://127.0.0.1:4599/product/the-chunky-monogram/', { waitUntil:'domcontentloaded' });
console.log('\nchunky monogram status:', r.status());
expect(r.status() === 404, `chunky monogram still served (${r.status()})`);

console.log(fail.length ? `\nFAILURES:\n - ${fail.join('\n - ')}` : '\nALL CHECKS PASSED');
await b.close(); process.exit(fail.length?1:0);
