import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/api/health/route.ts",
  "app/api/merchant-feed/route.ts",
  "lib/auth/session.ts",
  "firestore.rules",
  "storage.rules",
  ".env.example",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
const envText = fs.readFileSync(path.join(root, ".env.example"), "utf8");
const requiredEnvNames = [
  "VVOS_DATA_MODE",
  "VVOS_REQUIRE_AUTH",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "FIREBASE_ADMIN_PROJECT_ID",
  "VWE_WEBHOOK_SECRET",
  "HEXON_SYNC_USERNAME",
  "HEXON_SYNC_PASSWORD",
  "GOOGLE_MERCHANT_ID",
  "CRON_SECRET",
  "PORTAL_TOKEN_SECRET",
];
const missingEnv = requiredEnvNames.filter((name) => !envText.includes(`${name}=`));

const routeFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === "route.ts" || entry.name === "page.tsx") routeFiles.push(path.relative(root, full));
  }
}
walk(path.join(root, "app"));

const result = {
  ok: missing.length === 0 && missingEnv.length === 0,
  version: JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version,
  routesAndPages: routeFiles.length,
  missingFiles: missing,
  missingEnvironmentKeys: missingEnv,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
