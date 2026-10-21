import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GET as getMerchantFeed } from "@/app/api/merchant-feed/route";
import { GET as getRdwVehicle } from "@/app/api/rdw/vehicle/route";
import { GET as getPortal } from "@/app/api/portal/[token]/route";
import { POST as createPayment } from "@/app/api/payments/create/route";
import { isAuthenticationRequired, isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";

const previous = {
  dataMode: process.env.VVOS_DATA_MODE,
  requireAuth: process.env.VVOS_REQUIRE_AUTH,
  rdwBase: process.env.RDW_API_BASE_URL,
  environment: process.env.VVOS_ENV,
};

afterEach(() => {
  process.env.VVOS_DATA_MODE = previous.dataMode;
  process.env.VVOS_REQUIRE_AUTH = previous.requireAuth;
  process.env.RDW_API_BASE_URL = previous.rdwBase;
  process.env.VVOS_ENV = previous.environment;
});

describe("production data boundaries", () => {
  it("does not return a fabricated RDW vehicle in Firebase mode", async () => {
    process.env.VVOS_DATA_MODE = "firebase";
    delete process.env.RDW_API_BASE_URL;
    const response = await getRdwVehicle(new Request("https://staging.voltvroom.nl/api/rdw/vehicle?kenteken=12ABCD"));
    expect(response.status).toBe(503);
  });

  it("does not return the sample Merchant feed in Firebase mode without Firestore", async () => {
    process.env.VVOS_DATA_MODE = "firebase";
    const response = await getMerchantFeed();
    expect(response.status).toBe(503);
  });

  it("does not statically publish sample vehicle detail pages in Firebase mode", () => {
    const page = readFileSync(resolve(process.cwd(), "app/voorraad/[slug]/page.tsx"), "utf8");
    const repository = readFileSync(resolve(process.cwd(), "lib/repositories/public-vehicle-repository.ts"), "utf8");
    const publication = readFileSync(resolve(process.cwd(), "lib/vehicle/publication.ts"), "utf8");
    expect(page).toContain("return [];");
    expect(page).toContain("cache(getPublicVehicleBySlug)");
    expect(page).toContain("getVehicle(slug)");
    expect(repository).toContain('publicInventoryMode(process.env) !== "firebase"');
    expect(repository).toContain('.where("status", "==", "available")');
    expect(repository).toContain("isPublishedOnWebsite(vehicle)");
    expect(publication).toContain('vehicle.publication?.channels.website === true');
  });

  it("does not expose the sample customer portal in Firebase mode", async () => {
    process.env.VVOS_DATA_MODE = "firebase";
    const response = await getPortal(new Request("https://staging.voltvroom.nl/api/portal/demo-sanne-0042"), {
      params: Promise.resolve({ token: "demo-sanne-0042" }),
    });
    expect(response.status).toBe(503);
  });

  it("binds Hexon credentials through staging Secret Manager references", () => {
    const config = readFileSync(resolve(process.cwd(), "apphosting.yaml"), "utf8");
    expect(config).toMatch(/variable: HEXON_SYNC_USERNAME\r?\n    secret: HEXON_SYNC_USERNAME/);
    expect(config).toMatch(/variable: HEXON_SYNC_PASSWORD\r?\n    secret: HEXON_SYNC_PASSWORD/);
    expect(config).not.toMatch(/HEXON_SYNC_(?:USERNAME|PASSWORD):\s*[^\n]+/);
  });

  it("never reports a payment as created before a provider transaction succeeds", async () => {
    process.env.VVOS_ENV = "local";
    process.env.VVOS_DATA_MODE = "demo";
    process.env.VVOS_REQUIRE_AUTH = "false";
    const response = await createPayment(new Request("https://staging.voltvroom.nl/api/payments/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId: "DEAL-test", amountCents: 10000 }),
    }));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, status: "not_created", paymentUrl: null });
  });

  it("only permits the auth bypass in an explicit local demo environment", () => {
    process.env.VVOS_REQUIRE_AUTH = "false";
    process.env.VVOS_DATA_MODE = "demo";
    process.env.VVOS_ENV = "staging";
    expect(isLocalDemoAuthBypassAllowed()).toBe(false);
    expect(isAuthenticationRequired()).toBe(true);

    process.env.VVOS_ENV = "local";
    expect(isLocalDemoAuthBypassAllowed()).toBe(true);
    expect(isAuthenticationRequired()).toBe(false);

    process.env.VVOS_DATA_MODE = "firebase";
    expect(isLocalDemoAuthBypassAllowed()).toBe(false);
    expect(isAuthenticationRequired()).toBe(true);
  });

  it("rejects staging Firebase values in the production readiness gate", () => {
    const secret = "x".repeat(32);
    const result = spawnSync(process.execPath, ["scripts/production-readiness.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        VVOS_ENV: "production",
        VVOS_DATA_MODE: "firebase",
        NEXT_PUBLIC_VVOS_DATA_MODE: "firebase",
        VVOS_REQUIRE_AUTH: "true",
        NEXT_PUBLIC_SITE_URL: "https://www.voltvroom.nl",
        NEXT_PUBLIC_FIREBASE_API_KEY: "production-shaped-api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "voltvroom-staging.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "voltvroom-staging",
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "voltvroom-staging.firebasestorage.app",
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:production",
        GOOGLE_CLOUD_PROJECT: "voltvroom-staging",
        CRON_SECRET: secret,
        VWE_WEBHOOK_SECRET: secret,
        HEXON_SYNC_USERNAME: secret,
        HEXON_SYNC_PASSWORD: secret,
        PORTAL_TOKEN_SECRET: secret,
        AUDIT_HASH_SALT: secret,
      },
    });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).unsafe).toContain("Firebase clientconfig mag geen stagingwaarde bevatten");
  });

  it("accepts a complete production-shaped public website configuration", () => {
    const secret = "x".repeat(32);
    const result = spawnSync(process.execPath, ["scripts/production-readiness.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        VVOS_ENV: "production",
        VVOS_DATA_MODE: "firebase",
        NEXT_PUBLIC_VVOS_DATA_MODE: "firebase",
        VVOS_REQUIRE_AUTH: "true",
        NEXT_PUBLIC_SITE_URL: "https://www.voltvroom.nl",
        NEXT_PUBLIC_FIREBASE_API_KEY: "production-shaped-api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "voltvroom-productie.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "voltvroom-productie",
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "voltvroom-productie.firebasestorage.app",
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:production",
        GOOGLE_CLOUD_PROJECT: "voltvroom-productie",
        CRON_SECRET: secret,
        VWE_WEBHOOK_SECRET: secret,
        HEXON_SYNC_USERNAME: secret,
        HEXON_SYNC_PASSWORD: secret,
        PORTAL_TOKEN_SECRET: secret,
        AUDIT_HASH_SALT: secret,
      },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ready: true,
      target: "https://www.voltvroom.nl",
      missing: [],
      unsafe: [],
    });
  });

});
