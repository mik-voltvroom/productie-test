import { describe, expect, it } from "vitest";
import { isPublicRoute, isServiceHookRoute } from "@/lib/routing/access";

describe("route access policy", () => {
  it.each(["/api/health", "/api/merchant-feed", "/api/leads", "/api/public/social-videos", "/api/public/social-videos/VIDEO-test/events", "/portal/demo-token", "/api/portal/demo-token"])(
    "keeps %s public",
    (route) => expect(isPublicRoute(route)).toBe(true),
  );

  it.each(["/dashboard", "/dashboard/finance", "/api/finance/dashboard", "/api/sales/score", "/api/audit"])(
    "keeps %s internal",
    (route) => expect(isPublicRoute(route)).toBe(false),
  );

  it("does not make lookalike public API paths public", () => {
    expect(isPublicRoute("/api/public/social-videos-internal")).toBe(false);
  });

  it("classifies secret-protected hooks separately", () => {
    expect(isServiceHookRoute("/api/cron/sync")).toBe(true);
    expect(isServiceHookRoute("/api/vwe/import")).toBe(true);
    expect(isServiceHookRoute("/api/hexon/inventory")).toBe(true);
    expect(isServiceHookRoute("/api/health")).toBe(false);
  });
});
