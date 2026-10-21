import { siteConfiguration } from '../lib/environment/business.ts';
const site = siteConfiguration(process.env);
const env = process.env.VVOS_ENV;
const url = process.env.NEXT_PUBLIC_SITE_URL || "";
const errors = [];

if (!['staging','production'].includes(env)) errors.push('VVOS_ENV moet staging of production zijn');
if (process.env.VVOS_DATA_MODE !== 'firebase') errors.push('VVOS_DATA_MODE moet firebase zijn');
if (process.env.VVOS_REQUIRE_AUTH !== 'true') errors.push('VVOS_REQUIRE_AUTH moet true zijn');

if (!site.validOrigin) errors.push('NEXT_PUBLIC_SITE_URL moet een geldige origin zonder pad zijn');
if (env === 'staging' && site.productionOrigin) errors.push('Staging mag niet naar het production domein wijzen');
if (env === 'production' && !site.indexable) errors.push('Production vereist de expliciete Firebase- en HTTPS-productieconfiguratie');

for (const key of ['CRON_SECRET', 'VWE_WEBHOOK_SECRET', 'HEXON_SYNC_USERNAME', 'HEXON_SYNC_PASSWORD', 'PORTAL_TOKEN_SECRET', 'AUDIT_HASH_SALT']) {
  const value = process.env[key] || '';
  if (value.length < 24) errors.push(`${key} ontbreekt of is te kort`);
}

console.log(JSON.stringify({ ok: errors.length === 0, environment: env, siteUrl: url, errors }, null, 2));
if (errors.length) process.exit(1);
