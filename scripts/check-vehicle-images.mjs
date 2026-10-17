// Read-only public diagnostic. No Firebase credentials or inventory writes.
import { createHash } from 'node:crypto';
import { carEntities } from './seo-schema.mjs';
const page = new URL(process.env.VEHICLE_URL || process.argv[2] || '');
const siteHosts = new Set(['www.voltvroom.nl', 'voltvroom.nl']);
const imageHosts = new Set([...siteHosts, 'media-eigenwebsiteincrementeel.export.dv.nl', 'firebasestorage.googleapis.com', 'storage.googleapis.com']);
function allowed(url, hosts) {
  if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Unapproved public URL');
}
allowed(page, siteHosts);
if (!page.pathname.startsWith('/voorraad/')) throw new Error('Expected a vehicle detail page');
async function get(url, hosts) {
  for (let redirects = 0; redirects < 4; redirects++) {
    allowed(url, hosts);
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'VoltVroom-PublicImageCheck/1.0', 'Cache-Control': 'no-cache' } });
    if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
      await response.body?.cancel(); url = new URL(response.headers.get('location'), url); continue;
    }
    return response;
  }
  throw new Error('Too many redirects');
}
const response = await get(page, siteHosts);
if (!response.ok) throw new Error(`Vehicle page HTTP ${response.status}`);
const html = await response.text();
if (html.length > 8000000) throw new Error('Page too large');
const schemas = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match => {
  const value = JSON.parse(match[1]); return Array.isArray(value) ? value : [value];
});
const cars = carEntities(schemas);
if (cars.length !== 1) throw new Error('Expected exactly one public Car entity');
const car = cars[0];
const images = Array.isArray(car.image) ? car.image : car.image ? [car.image] : [];
if (images.length > 200) throw new Error('Unexpected image count');
console.log(JSON.stringify({ page: page.pathname, pageStatus: response.status, images: images.length, descriptionCharacters: String(car.description || '').length }));
let failed = images.length === 0;
for (let index = 0; index < images.length; index++) {
  const raw = typeof images[index] === 'string' ? images[index] : images[index]?.url;
  const hash = createHash('sha256').update(String(raw)).digest('hex').slice(0, 12);
  try {
    const url = new URL(raw, page);
    const image = await get(url, imageHosts);
    const type = image.headers.get('content-type') || '';
    const reader = image.body?.getReader();
    const chunk = await reader?.read();
    await reader?.cancel();
    const ok = image.ok && type.startsWith('image/') && (chunk?.value?.length ?? 0) > 0;
    failed ||= !ok;
    console.log(JSON.stringify({ index: index + 1, hash, host: url.hostname, status: image.status, type, nonempty: Boolean(chunk?.value?.length), ok }));
  } catch (error) {
    failed = true;
    console.log(JSON.stringify({ index: index + 1, hash, ok: false, error: error instanceof Error ? error.name : 'unknown' }));
  }
}
if (failed) process.exitCode = 1;
