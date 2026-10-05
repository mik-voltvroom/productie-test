import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const base = process.env.LEASE_TEST_ORIGIN || 'http://127.0.0.1:4322';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname));
const output = path.resolve(process.env.LEASE_TEST_OUTPUT || path.join(import.meta.dirname, '../qa/lease'));
await fs.mkdir(path.join(output, 'screenshots'), { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'nl-NL' });
await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
const page = await context.newPage();
let requests = [], status = 201, errors = [];
page.on('pageerror', e => errors.push(e.message));
await context.route('**/api/leads', async route => {
  requests.push(route.request().postDataJSON());
  await new Promise(resolve => setTimeout(resolve, 350));
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 201 ? { ok: true, id: 'mock-only' } : { ok: false, error: 'Lokale testfout' }) });
});
const results = [];
async function check(name, action) {
  try { await action(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (e) { results.push({ name, passed: false, error: e.message }); console.log('FAIL', name, e.message); }
}
const url = `${base}/voorraad/toyota-corolla-touring-sports-18-hybrid-dynamic`;
const lease = page.locator('#financial-lease');
async function open() {
  await page.goto(url, { waitUntil: 'networkidle' });
  await lease.getByRole('button', { name: 'Vraag vrijblijvend leasevoorstel aan' }).click();
}
async function fill() {
  for (const [name, value] of Object.entries({ companyName: 'Voorbeeld BV', kvk: '12345678', name: 'Test Aanvrager', phone: '0612345678', email: 'test@example.com' })) {
    await lease.locator(`[name="${name}"]`).fill(value);
  }
  await lease.locator('[name="consent"]').check();
}
await check('Lease calculator and vehicle-bound contact/trade-in links coexist', async () => {
  await open();
  assert.match(await lease.innerText(), /Financial lease/);
  assert.match(await lease.innerText(), /geen offerte of kredietgoedkeuring/);
  assert.match(await lease.innerText(), /Indicatieve maandtermijn/);
  const links = await page.locator('a[data-vv-event="test_drive_click"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  assert.equal(links.length, 2);
  for (const href of links) assert.equal(new URL(href, base).searchParams.get('vehicleId'), 'VV-2026-001');
  assert(await page.locator('a[href*="/inruilen?"]').count() > 0);
});
await check('Lease validation prevents an empty submit', async () => {
  await lease.getByRole('button', { name: 'Verstuur mijn aanvraag' }).click();
  assert.equal(requests.length, 0);
});
await check('Normal lease double click submits one canonical vehicle request and shows mocked success', async () => {
  await fill();
  const button = lease.getByRole('button', { name: 'Verstuur mijn aanvraag' });
  await button.dblclick();
  await lease.getByRole('status').waitFor();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].type, 'financial_lease');
  assert.equal(requests[0].vehicleId, 'VV-2026-001');
  assert.equal(requests[0].expectedAnnualRateBps, 850);
  assert.match(await lease.getByRole('status').innerText(), /persoonlijk leasevoorstel/);
});
await check('Two same-turn synthetic lease clicks are deduplicated (stress regression)', async () => {
  const before = requests.length;
  await open(); await fill();
  await lease.getByRole('button', { name: 'Verstuur mijn aanvraag' }).evaluate(node => { node.click(); node.click(); });
  await lease.getByRole('status').waitFor();
  assert.equal(requests.length, before + 1);
});
await check('Lease mocked storage error remains retryable', async () => {
  const before = requests.length;
  status = 503;
  await open(); await fill();
  await lease.getByRole('button', { name: 'Verstuur mijn aanvraag' }).click();
  await lease.getByRole('alert').waitFor();
  assert.equal(await lease.getByRole('alert').innerText(), 'Lokale testfout');
  assert.equal(await lease.getByRole('button', { name: 'Verstuur mijn aanvraag' }).isEnabled(), true);
  status = 201;
  await lease.getByRole('button', { name: 'Verstuur mijn aanvraag' }).click();
  await lease.getByRole('status').waitFor();
  assert.equal(requests.length, before + 2);
});
for (const width of [768, 390, 320]) {
  await check(`Lease form fits ${width}px and retains its disclosure`, async () => {
    await page.setViewportSize({ width, height: 844 });
    await open();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const bounds = await lease.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= width);
    assert.match(await lease.innerText(), /geen offerte of kredietgoedkeuring/);
    await page.setViewportSize({ width, height: Math.max(844, Math.ceil(bounds.height) + 160) });
    await lease.screenshot({ path: path.join(output, `screenshots/lease-${width}.png`) });
  });
}
await check('No browser runtime errors', async () => assert.deepEqual(errors, []));
for (const width of [1440, 390]) {
  await check(`Icons keeps its restrained hero without glow at ${width}px`, async () => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/icons`, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const hero = page.locator('main > section').first();
    assert.equal(await hero.locator('div[aria-hidden="true"]').evaluate(node => getComputedStyle(node).boxShadow), 'none');
    await hero.screenshot({ path: path.join(output, `screenshots/icons-${width}.png`) });
  });
}
await check('Icons browser runtime has no errors', async () => assert.deepEqual(errors, []));
await context.close(); await browser.close();
await fs.writeFile(path.join(output, 'lease-browser-results.json'), JSON.stringify({ results, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length }, null, 2));
if (results.some(r => !r.passed)) process.exitCode = 1;
