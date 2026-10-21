import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ database: null as unknown, auth: vi.fn(async () => ({ actor: { uid: "synthetic", role: "owner", email: null } })), path: "/" }));
vi.mock("@/lib/firebase-admin", () => ({ get adminDb() { return mocks.database; } }));
vi.mock("@/lib/auth/api", () => ({ authorizeApi: mocks.auth }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.path }));
import { createServerDocument, updateServerDocument, listServerCollection } from "@/lib/repositories/server-collection";
import { GET as finance } from "@/app/api/finance/dashboard/route";
import { POST as invoice } from "@/app/api/finance/invoices/route";
import { POST as reconcile } from "@/app/api/finance/reconcile/route";
import { AlertPrivacyBoundary } from "@/components/stock-alerts/AlertPrivacyBoundary";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("production reliability boundaries", () => {
  it("cannot acknowledge missing durable storage", async () => {
    vi.stubEnv("VVOS_ENV", "production"); vi.stubEnv("VVOS_DATA_MODE", "firebase");
    await expect(createServerDocument("leads", "synthetic", {})).rejects.toThrow();
    await expect(updateServerDocument("leads", "synthetic", {})).rejects.toThrow();
    await expect(listServerCollection("leads", [{ id: "fake" }])).rejects.toThrow();
  });
  it("does not offer financial samples or pretend invoice/reconciliation writes in production", async () => {
    vi.stubEnv("VVOS_ENV", "production"); vi.stubEnv("VVOS_DATA_MODE", "firebase");
    for (const handler of [finance, invoice, reconcile]) {
      const response = await handler(new Request("https://example.test/api/finance", { method: "POST", body: "{}" }));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false, mode: "unavailable" });
    }
  });
  it.each(["/dashboard", "/dashboard/voorraad/test", "/portal/private-token", "/voorraadalert/bevestigen", "/login"])("does not mount public widgets on %s", path => {
    mocks.path = path;
    expect(renderToStaticMarkup(createElement(AlertPrivacyBoundary, { children: createElement("script", { src: "https://example.invalid/widget" }) }))).toBe("");
  });
  it("keeps public widgets available on public pages", () => {
    mocks.path = "/voorraad/test";
    expect(renderToStaticMarkup(createElement(AlertPrivacyBoundary, { children: "public" }))).toBe("public");
  });
  it("defaults browser business data to Firebase when configuration is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_VVOS_DATA_MODE", ""); vi.stubEnv("NEXT_PUBLIC_VVOS_ENV", "");
    expect((await import("@/lib/config")).integrationMode).toBe("firebase");
  });
});
