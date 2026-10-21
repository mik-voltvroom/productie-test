const requiredConfig = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const requiredSecrets = [
  "CRON_SECRET",
  "VWE_WEBHOOK_SECRET",
  "HEXON_SYNC_USERNAME",
  "HEXON_SYNC_PASSWORD",
  "PORTAL_TOKEN_SECRET",
  "AUDIT_HASH_SALT",
];

function value(key) {
  return String(process.env[key] || "").trim();
}

function isPlaceholder(candidate) {
  return !candidate
    || /replace[-_ ]?with|replace[-_ ]?in|placeholder|example/i.test(candidate);
}

const missing = requiredConfig.filter((key) => isPlaceholder(value(key)));
const unsafe = [];

for (const key of requiredSecrets) {
  const candidate = value(key);
  if (isPlaceholder(candidate) || candidate.length < 24) {
    unsafe.push(`${key} ontbreekt, is een placeholder of is korter dan 24 tekens`);
  }
}

const siteUrl = value("NEXT_PUBLIC_SITE_URL");
const clientProjectId = value("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const clientConfig = requiredConfig
  .filter((key) => key.startsWith("NEXT_PUBLIC_FIREBASE_"))
  .map((key) => value(key));

if (value("VVOS_ENV") !== "production") unsafe.push("VVOS_ENV moet production zijn");
if (value("VVOS_DATA_MODE") !== "firebase") unsafe.push("VVOS_DATA_MODE moet firebase zijn");
if (value("NEXT_PUBLIC_VVOS_DATA_MODE") !== "firebase") unsafe.push("NEXT_PUBLIC_VVOS_DATA_MODE moet firebase zijn");
if (value("VVOS_REQUIRE_AUTH") !== "true") unsafe.push("VVOS_REQUIRE_AUTH moet true zijn");
if (value("NODE_ENV") !== "production") unsafe.push("NODE_ENV moet production zijn");
if (siteUrl !== "https://www.voltvroom.nl") unsafe.push("NEXT_PUBLIC_SITE_URL moet exact https://www.voltvroom.nl zijn");
if (clientConfig.some((candidate) => /staging/i.test(candidate))) unsafe.push("Firebase clientconfig mag geen stagingwaarde bevatten");
if (/staging/i.test(clientProjectId)) unsafe.push("Production mag niet het staging Firebase-project gebruiken");

const runtimeProjectId = value("GOOGLE_CLOUD_PROJECT") || value("GCLOUD_PROJECT");
const hasRuntimeIdentity = Boolean(runtimeProjectId || value("K_SERVICE"));
const adminParts = [
  value("FIREBASE_ADMIN_PROJECT_ID"),
  value("FIREBASE_ADMIN_CLIENT_EMAIL"),
  value("FIREBASE_ADMIN_PRIVATE_KEY"),
];
const hasAnyServiceAccount = adminParts.some(Boolean);
const hasCompleteServiceAccount = adminParts.every(Boolean);

if (!hasRuntimeIdentity && !hasCompleteServiceAccount) {
  unsafe.push("Firebase Admin vereist een runtime identity of alle FIREBASE_ADMIN_* waarden");
}
if (hasAnyServiceAccount && !hasCompleteServiceAccount) {
  unsafe.push("FIREBASE_ADMIN_* is gedeeltelijk ingesteld");
}
if (runtimeProjectId && clientProjectId && runtimeProjectId !== clientProjectId) {
  unsafe.push("Runtime- en Firebase clientproject komen niet overeen");
}
if (value("FIREBASE_ADMIN_PROJECT_ID") && clientProjectId && value("FIREBASE_ADMIN_PROJECT_ID") !== clientProjectId) {
  unsafe.push("Firebase Admin- en clientproject komen niet overeen");
}

const result = {
  ready: missing.length === 0 && unsafe.length === 0,
  target: "https://www.voltvroom.nl",
  missing,
  unsafe,
  checkedAt: new Date().toISOString(),
};

console.log(JSON.stringify(result, null, 2));
if (!result.ready) process.exitCode = 1;
