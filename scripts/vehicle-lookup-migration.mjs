// Read-only unless --apply is explicitly supplied. No credentials or source records are printed.
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { buildVehicleLookup, validVehicleLookup } = require('../lib/vehicle-lookup/business.ts');
const { vehicleDigest } = require('../lib/vehicle/mobilox-repair.ts');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const projectId = arg('--project');
const planPath = arg('--plan');
const writerCommit = arg('--writers-deployed');
if (!planPath || (!projectId && !arg('--snapshot')) || (projectId && arg('--snapshot'))) {
  throw new Error('Gebruik: node scripts/vehicle-lookup-migration.mjs --plan PRIVATE_PLAN.json (--snapshot PRIVATE_SNAPSHOT.json | --project PROJECT_ID) [--apply --writers-deployed DEPLOYED_COMMIT_SHA]');
}
if (apply && (!projectId || !/^[0-9a-f]{40}$/.test(writerCommit ?? ''))) throw new Error('--apply vereist project en expliciete bevestiging van de uitgerolde writer-commit. Zie docs/seo-lookup.md.');
let db;
if (projectId) {
  if (process.env.FIREBASE_ADMIN_PROJECT_ID !== projectId) throw new Error('FIREBASE_ADMIN_PROJECT_ID moet exact overeenkomen met --project.');
  db = require('../lib/firebase-admin.ts').adminDb;
  if (!db) throw new Error('Firebase Admin niet beschikbaar.');
}
async function readRows() {
  if (!db) return Object.entries(JSON.parse(fs.readFileSync(arg('--snapshot'), 'utf8'))).map(([id, value]) => ({ ...value, id }));
  const rows = []; let cursor;
  for (;;) {
    const query = db.collection('vehicles').limit(250);
    const page = await (cursor ? query.startAfter(cursor) : query).get();
    rows.push(...page.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    if (page.docs.length < 250) return rows;
    cursor = page.docs.at(-1);
  }
}
const rows = await readRows();
const records = rows.map(row => {
  const lookup = buildVehicleLookup(row, row);
  return { id: row.id, beforeSha256: vehicleDigest(row), changed: vehicleDigest(row.publicLookup ?? null) !== vehicleDigest(lookup),
    slugCount: lookup.slugs.length, identityKeyCount: lookup.identityKeys.length };
}).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const plan = { version: 1, projectId: projectId ?? 'offline', checkedAt: new Date().toISOString(), records };
if (!apply) {
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
  console.log(JSON.stringify({ mode: 'dry-run', count: records.length, changes: records.filter(row => row.changed).length }));
} else {
  const approved = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  if (approved.version !== 1 || approved.projectId !== projectId || vehicleDigest(approved.records) !== vehicleDigest(records)) throw new Error('Plan verouderd of verkeerde omgeving: maak en beoordeel een nieuwe dry-run.');
  const marker = db.collection('seoState').doc('publicVehicleLookup');
  // A partial backfill remains safe: every reader uses the legacy path while building.
  await marker.set({ version: 1, state: 'building', writerCommit, startedAt: new Date().toISOString() });
  for (const record of records) {
    const ref = db.collection('vehicles').doc(record.id);
    await db.runTransaction(async transaction => {
      const document = await transaction.get(ref);
      const row = { ...document.data(), id: record.id };
      if (!document.exists || vehicleDigest(row) !== record.beforeSha256) throw new Error('Bron tussentijds gewijzigd; stop en plan opnieuw.');
      if (record.changed) transaction.update(ref, { publicLookup: buildVehicleLookup(row, row) });
    });
  }
  // Verify coverage and activate atomically, without changing source fields or updatedAt.
  await db.runTransaction(async transaction => {
    // On real Firestore these probes also reject missing/not-ready query indexes.
    await transaction.get(db.collection('vehicles').where('status', '==', 'available').where('publicLookup.identityKeys', 'array-contains-any', ['lookup:readiness-check']).limit(1));
    await transaction.get(db.collection('vehicles').where('publicLookup.slugs', 'array-contains', 'lookup-readiness-check').limit(1));
    const snapshot = await transaction.get(db.collection('vehicles').select('slug', 'vin', 'licensePlate', 'publicLookup'));
    for (const document of snapshot.docs) {
      if (!validVehicleLookup({ ...document.data(), id: document.id })) throw new Error('Onvolledige lookupdekking; legacy-selectie blijft actief.');
    }
    transaction.set(marker, { version: 1, state: 'ready', writerCommit, verifiedCount: snapshot.size, verifiedAt: new Date().toISOString() });
  });
  console.log(JSON.stringify({ mode: 'applied', count: records.length, state: 'ready' }));
}
if (db) await db.terminate();
