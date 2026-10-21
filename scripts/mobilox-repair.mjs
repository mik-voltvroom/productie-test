// Uses the repository's TypeScript dependency, without adding a production dependency.
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
Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
const { planMobiloxRepair, vehicleDigest } = require('../lib/vehicle/mobilox-repair.ts');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const arg = name => args[args.indexOf(name) + 1];
if (!args.includes('--input') || !args.includes('--plan') || (apply && !args.includes('--project'))) {
  throw new Error('Gebruik: node scripts/mobilox-repair.mjs --input XML_MAP --plan PLAN.json [--snapshot SNAPSHOT.json | --project PROJECT_ID] [--apply]');
}
const files = fs.readdirSync(arg('--input')).filter(name => name.endsWith('.xml')).sort();
if (!files.length) throw new Error('Geen XML-bestanden gevonden.');
let db;
let snapshot;
if (args.includes('--snapshot')) {
  if (apply) throw new Error('--snapshot is alleen voor een offline dry-run.');
  snapshot = JSON.parse(fs.readFileSync(arg('--snapshot'), 'utf8'));
} else {
  if (!args.includes('--project')) throw new Error('Geef --snapshot of --project op.');
  const projectId = arg('--project');
  if (process.env.FIREBASE_ADMIN_PROJECT_ID !== projectId) throw new Error('FIREBASE_ADMIN_PROJECT_ID moet exact gelijk zijn aan --project.');
  db = require('../lib/firebase-admin.ts').adminDb;
  if (!db) throw new Error('Firebase Admin niet beschikbaar.');
}
const { parseHexonMutation } = require('../lib/integrations/hexon.ts');
const approved = apply ? JSON.parse(fs.readFileSync(arg('--plan'), 'utf8')) : undefined;
if (apply && approved.projectId !== arg('--project')) throw new Error('Plan behoort niet tot dit Firebase-project.');
const records = [];
const seen = new Set();
const now = new Date().toISOString();
// Validate every file before making the first write.
for (const file of files) {
  const xml = fs.readFileSync(path.join(arg('--input'), file), 'utf8');
  const id = parseHexonMutation(xml).vehicle?.id;
  if (!id || seen.has(id)) throw new Error('Alleen één volledige upsert per voertuig is toegestaan.');
  seen.add(id);
  const document = db ? await db.collection('vehicles').doc(id).get() : undefined;
  const current = db ? document.data() : snapshot[id];
  if (!current) throw new Error(`Bestaand voertuig ontbreekt: ${id}`);
  const plan = await planMobiloxRepair({ ...current, id }, xml, now);
  if (apply) {
    const entry = approved.records.find(record => record.id === id);
    if (!entry || entry.payloadSha256 !== plan.payloadSha256 || (plan.changed && entry.beforeSha256 !== plan.beforeSha256)) throw new Error(`Plan verouderd of bron gewijzigd: ${id}. Voer opnieuw een dry-run uit.`);
  }
  records.push({ plan, xml });
}
if (apply && approved.records.length !== records.length) throw new Error('Bestandenset wijkt af van het plan.');
for (const { plan, xml } of records) {
  if (apply && plan.changed) {
    const ref = db.collection('vehicles').doc(plan.id);
    await db.runTransaction(async transaction => {
      const document = await transaction.get(ref);
      const current = { ...document.data(), id: plan.id };
      if (!document.exists || vehicleDigest(current) !== plan.beforeSha256) throw new Error(`Voertuig tussentijds gewijzigd: ${plan.id}. Stop en plan opnieuw.`);
      const fresh = await planMobiloxRepair(current, xml, now);
      // Server-only backup, never part of public vehicles or console output.
      transaction.set(db.collection('inventoryRepairBackups').doc(`${plan.id}-${plan.beforeSha256}`), { vehicle: document.data(), payloadSha256: plan.payloadSha256, createdAt: now });
      transaction.set(ref, fresh.replacement);
      transaction.create(db.collection('audit_logs').doc(), { action: 'vehicle.mobilox.repair', entityId: plan.id, createdAt: now, payloadSha256: plan.payloadSha256 });
    });
  }
  console.log(JSON.stringify({ id: plan.id, action: !plan.changed ? 'noop' : apply ? 'repaired' : 'would-repair', images: plan.imageCount, options: plan.optionCount }));
}
if (!apply) fs.writeFileSync(arg('--plan'), JSON.stringify({ projectId: args.includes('--project') ? arg('--project') : null, createdAt: now, records: records.map(({ plan: { replacement, ...summary } }) => summary) }, null, 2), { mode: 0o600 });
