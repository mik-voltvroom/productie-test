import fs from "node:fs";
import { spawnSync } from "node:child_process";

const projectId = "voltvroom-productie";
const alias = "production";

function fail(message) {
  console.error(`REFUSED: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(".firebaserc")) fail(".firebaserc ontbreekt.");
if (!fs.existsSync("firestore.rules")) fail("firestore.rules ontbreekt.");
if (!fs.existsSync("firestore.indexes.json")) fail("firestore.indexes.json ontbreekt.");

const rc = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
if (rc?.projects?.[alias] !== projectId) {
  fail(`Firebase alias '${alias}' moet exact naar '${projectId}' wijzen.`);
}
if (rc?.projects?.staging === projectId || rc?.projects?.default === projectId) {
  fail("Production mag niet als staging/default alias zijn ingesteld in deze releaseflow.");
}

const rules = fs.readFileSync("firestore.rules", "utf8");
if (!rules.includes("rules_version = '2'")) fail("Onverwachte Firestore rules-versie.");

const indexes = JSON.parse(fs.readFileSync("firestore.indexes.json", "utf8"));
if (!Array.isArray(indexes.indexes)) fail("firestore.indexes.json bevat geen geldige indexes-array.");

console.log(`Deploy target bevestigd: ${alias} -> ${projectId}`);
console.log(`Firestore indexes: ${indexes.indexes.length}`);
console.log("Deploying only Firestore rules and indexes. No hosting/functions/storage deployment is included.");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["firebase", "deploy", "--only", "firestore:rules,firestore:indexes", "--project", alias],
  { stdio: "inherit", shell: false },
);

if (result.error) fail(result.error.message);
process.exit(result.status ?? 1);
