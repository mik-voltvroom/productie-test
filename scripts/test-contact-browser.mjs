import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.CONTACT_TEST_ORIGIN || 'http://127.0.0.1:4317';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Browser tests only permit a local server');
const reportDirectory = path.resolve(process.env.CONTACT_TEST_OUTPUT || path.join(import.meta.dirname, '../qa'));
const output = path.join(reportDirectory, 'screenshots');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
const results = [];
const errors = [];
async function check(name, action) {
  try { await action(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.log('FAIL', name, error.message); }
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL' });
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  return url.origin === base ? route.continue() : route.abort();
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const field = name => page.locator(`[name="${name}"]`);
const form = () => page.locator('form.contactForm');
const button = () => form().locator('button[type="submit"]');
async function open(query = '') {
  await page.goto('about:blank');
  await page.goto(`${base}/contact${query}`, { waitUntil: 'networkidle' });
  await field('name').waitFor();
}
async function fillBasic() {
  await field('name').fill('Test Aanvrager');
  await field('email').fill('test@example.com');
  await field('consent').check();
}
async function fillDrive() {
  await fillBasic();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await field('preferredDate').fill(tomorrow);
  await field('daypart').selectOption('afternoon');
}
async function noOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const bounds = await form().boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= (await page.viewportSize()).width);
}
async function captureForm(filename) {
  const viewport = page.viewportSize();
  const bounds = await form().boundingBox();
  await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(bounds.height) + 160) });
  await form().screenshot({ path: path.join(output, filename) });
  await page.setViewportSize(viewport);
}
let requests = [];
let reply = { status: 201, body: { ok: true }, delay: 0 };
await context.route('**/api/leads', async route => {
  requests.push(route.request().postDataJSON());
  if (reply.delay) await new Promise(resolve => setTimeout(resolve, reply.delay));
  if (reply.abort) return route.abort();
  return route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) });
});

await check('General route has actual repository inventory and no appointment fields', async () => {
  await open();
  const options = await field('vehicleId').locator('option').allTextContents();
  assert.equal(options.length, 3);
  assert(options.includes('Toyota Corolla Touring Sports 1.8 Hybrid Dynamic'));
  assert(options.includes('Lexus UX 250h Business Line'));
  assert.equal(await field('vehicleId').inputValue(), '');
  assert.equal(await field('preferredDate').count(), 0);
  await noOverflow();
  await captureForm('desktop-general.png');
});

await check('Both production test-drive CTAs and question CTA pass stable ID; trade-in retains context', async () => {
  await page.goto(`${base}/voorraad/toyota-corolla-touring-sports-18-hybrid-dynamic`, { waitUntil: 'networkidle' });
  const driveLinks = await page.locator('a[data-vv-event="test_drive_click"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  assert.equal(driveLinks.length, 2);
  for (const href of driveLinks) {
    const url = new URL(href, base);
    assert.equal(url.pathname, '/contact');
    assert.equal(url.searchParams.get('vehicleId'), 'VV-2026-001');
    assert.equal(url.searchParams.get('intent'), 'proefrit');
  }
  const question = new URL(await page.getByRole('link', { name: 'Stel een vraag', exact: true }).getAttribute('href'), base);
  assert.equal(question.searchParams.get('vehicleId'), 'VV-2026-001');
  assert.equal(question.searchParams.get('intent'), 'vraag');
  const trade = new URL(await page.getByRole('link', { name: /Auto inruilen/ }).getAttribute('href'), base);
  assert.equal(trade.pathname, '/inruilen');
  assert.equal(trade.searchParams.get('vehicleId'), 'VV-2026-001');
  assert.equal(trade.searchParams.get('vehicleLabel'), 'Toyota Corolla Touring Sports 1.8 Hybrid Dynamic');
  await page.getByRole('link', { name: 'Plan een proefrit', exact: true }).first().click();
  await field('preferredDate').waitFor();
  assert.equal(await field('vehicleId').inputValue(), 'VV-2026-001');
  assert.equal(await field('interest').inputValue(), 'Proefrit plannen');
});

await check('Reloaded deep link ignores a forged title and offers date/daypart with confirmation notice', async () => {
  await open('?vehicleId=VV-2026-001&vehicleTitle=Vervalst&intent=proefrit#aanvraag');
  assert.equal(await field('vehicleId').inputValue(), 'VV-2026-001');
  assert(!(await form().innerText()).includes('Vervalst'));
  assert((await form().innerText()).includes('pas vast'));
  assert.equal(await field('preferredDate').getAttribute('min'), new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(new Date()));
  await noOverflow();
  await captureForm('desktop-test-drive.png');
});

await check('Client validation prevents empty/invalid requests and focuses the invalid control', async () => {
  requests = [];
  await button().click();
  assert.equal(requests.length, 0);
  assert.equal(await field('name').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'name');
  await fillBasic();
  await field('email').fill('bad');
  await button().click();
  assert.equal(requests.length, 0);
  assert.equal(await field('email').getAttribute('aria-invalid'), 'true');
  await field('email').fill('test@example.com');
  await field('preferredDate').fill('2020-01-01');
  await field('daypart').selectOption('afternoon');
  await button().click();
  assert.equal(requests.length, 0);
  assert.equal(await field('preferredDate').getAttribute('aria-invalid'), 'true');
  await captureForm('desktop-validation.png');
});

await check('Double submit sends one request and success does not promise a booked appointment', async () => {
  await fillDrive();
  requests = [];
  reply = { status: 201, body: { ok: true }, delay: 300 };
  await form().evaluate(node => { node.requestSubmit(); node.requestSubmit(); });
  await page.getByText('Uw proefritaanvraag is ontvangen.', { exact: true }).waitFor();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].vehicleId, 'VV-2026-001');
  assert.equal(requests[0].testDrive.daypart, 'afternoon');
  assert.equal(requests[0].interest, 'Proefrit plannen');
  assert(!('vehicleTitle' in requests[0]));
  assert((await page.locator('section.contactForm').innerText()).includes('pas vast na onze bevestiging'));
  assert.equal(await form().count(), 0);
  await page.locator('section.contactForm').screenshot({ path: path.join(output, 'desktop-success.png') });
});

for (const id of ['', 'unknown', 'deleted', '../private', 'x'.repeat(121)]) {
  await check(`Unavailable or invalid deep-link ID: ${id.slice(0, 20) || '(empty)'}`, async () => {
    await open(`?vehicleId=${encodeURIComponent(id)}&intent=proefrit`);
    assert.equal(await field('vehicleId').inputValue(), '');
    assert((await form().innerText()).includes('link is ongeldig'));
    requests = [];
    await fillDrive();
    await button().click();
    assert.equal(requests.length, 0);
    assert.equal(await field('vehicleId').getAttribute('aria-invalid'), 'true');
    await field('interest').selectOption('Adviesgesprek');
    assert.equal(await field('preferredDate').count(), 0);
  });
}

await check('Question deep link keeps car and does not show appointment fields', async () => {
  await open('?vehicleId=VV-2026-002&intent=vraag');
  assert.equal(await field('vehicleId').inputValue(), 'VV-2026-002');
  assert.equal(await field('interest').inputValue(), 'Vraag over voorraad');
  assert.equal(await field('preferredDate').count(), 0);
});

await check('General email-only request works with no vehicle or moment', async () => {
  await open();
  await fillBasic();
  requests = [];
  reply = { status: 201, body: { ok: true }, delay: 0 };
  await button().click();
  await page.getByText('Uw aanvraag is ontvangen.', { exact: true }).waitFor();
  assert.equal(requests.length, 1);
  for (const key of ['vehicleId', 'testDrive', 'phone', 'preferredContact']) assert(!(key in requests[0]));
});

for (const status of [400, 429, 500, 503]) {
  await check(`Server ${status} shows failure and preserves entered data for retry`, async () => {
    await open('?vehicleId=VV-2026-001&intent=proefrit');
    await fillDrive();
    requests = [];
    reply = { status, body: { ok: false, error: status === 400 ? 'Deze auto is niet meer beschikbaar.' : 'Probeer later opnieuw.', errors: status === 400 ? { fieldErrors: { vehicleId: ['Kies een andere auto.'] } } : undefined } };
    await button().click();
    await form().locator('.formFeedback.error').waitFor();
    assert.equal(await field('name').inputValue(), 'Test Aanvrager');
    assert.equal(await field('vehicleId').inputValue(), 'VV-2026-001');
    assert.equal(await button().isEnabled(), true);
    if (status === 400) assert.equal(await field('vehicleId').getAttribute('aria-invalid'), 'true');
  });
}

await check('Network failure allows a retry with data intact', async () => {
  await open();
  await fillBasic();
  reply = { abort: true };
  await button().click();
  await form().locator('.formFeedback.error').waitFor();
  assert((await form().innerText()).includes('Controleer uw verbinding'));
  assert.equal(await field('email').inputValue(), 'test@example.com');
  reply = { status: 201, body: { ok: true } };
  await button().click();
  await page.getByText('Uw aanvraag is ontvangen.', { exact: true }).waitFor();
});

await check('Changing interest removes appointment metadata from submission', async () => {
  await open('?vehicleId=VV-2026-001&intent=proefrit');
  await fillDrive();
  await field('interest').selectOption('Vraag over voorraad');
  requests = [];
  await button().click();
  await page.getByText('Uw aanvraag is ontvangen.', { exact: true }).waitFor();
  assert(!('testDrive' in requests[0]));
  assert.equal(requests[0].vehicleId, 'VV-2026-001');
});

for (const width of [768, 390, 320]) {
  await check(`Responsive test-drive form: ${width}px, no horizontal overflow, usable controls`, async () => {
    await page.setViewportSize({ width, height: 900 });
    await open('?vehicleId=VV-2026-001&intent=proefrit#aanvraag');
    await noOverflow();
    const selectBounds = await field('vehicleId').boundingBox();
    assert(selectBounds.width > 200 && selectBounds.height >= 40);
    const submitBounds = await button().boundingBox();
    assert(submitBounds.height >= 44);
    await captureForm(`test-drive-${width}.png`);
    await field('preferredDate').scrollIntoViewIfNeeded();
    await field('preferredDate').click();
    await fillDrive();
    reply = { status: 201, body: { ok: true } };
    await button().click();
    await page.getByText('Uw proefritaanvraag is ontvangen.', { exact: true }).waitFor();
  });
}

await check('Mobile production vehicle CTA navigates to the selected car', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/voorraad/toyota-corolla-touring-sports-18-hybrid-dynamic`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Plan een proefrit', exact: true }).first().click();
  await field('vehicleId').waitFor();
  assert.equal(await field('vehicleId').inputValue(), 'VV-2026-001');
  assert.equal(await field('interest').inputValue(), 'Proefrit plannen');
});

await check('Retained trade-in route opens its original three-step form', async () => {
  await page.goto(`${base}/inruilen?vehicleId=VV-2026-001&vehicleLabel=Toyota%20Corolla%20Touring%20Sports%201.8%20Hybrid%20Dynamic`, { waitUntil: 'networkidle' });
  await page.getByText('Stap 1 van 3', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('ol[aria-label="Voortgang inruilaanvraag"] > li').count(), 3);
  assert.equal(await page.locator('input[name="desiredVehicleId"]').inputValue(), 'VV-2026-001');
});

await check('Browser runtime has no JavaScript page errors', async () => assert.deepEqual(errors, []));
await browser.close();
await fs.writeFile(path.join(reportDirectory, 'browser-results.json'), JSON.stringify({ base, inventory: 'existing demo fixture (2 vehicles), production credentials not used', results, errors }, null, 2));
console.log(`${results.filter(result => result.passed).length}/${results.length} passed`);
if (results.some(result => !result.passed)) process.exitCode = 1;
