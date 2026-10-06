import { describe, expect, it, afterEach, vi } from "vitest";
import { isActiveInventory, matchesInventoryFilter } from "@/lib/vehicle/inventory";
import { getIntegrationHealth } from "@/lib/integrations/health";
import { vehicles } from "@/lib/sample-data";

afterEach(() => vi.unstubAllEnvs());
describe("Mobilox inventory removal", () => {
  it("hides provider-deleted stock while retaining access to the deal dossier", () => {
    const vehicle = { ...vehicles[0], status: "reserved" as const, reservedDealId: "deal-1", source: { provider: "mobilox-hexon", inventoryStatus: "archived" as const } };
    expect(isActiveInventory(vehicle)).toBe(false);
    expect(matchesInventoryFilter(vehicle, "active")).toBe(false);
    expect(matchesInventoryFilter(vehicle, "reserved")).toBe(false);
    expect(matchesInventoryFilter(vehicle, "archived")).toBe(true);
    expect(matchesInventoryFilter(vehicle, "all")).toBe(true);
    expect(vehicle.reservedDealId).toBe("deal-1");
  });
  it("includes available stock and excludes sold or archived stock from active inventory", () => {
    for (const status of ["available", "reserved", "review", "sold", "archived"] as const) {
      expect(isActiveInventory({ ...vehicles[0], source: undefined, status })).toBe(!["sold", "archived"].includes(status));
    }
  });
  it("checks the actual webhook credentials without claiming a successful sync", async () => {
    vi.stubEnv("HEXON_SYNC_USERNAME", "test"); vi.stubEnv("HEXON_SYNC_PASSWORD", "test-only");
    vi.stubEnv("MOBILOX_BASIC_AUTH_USERNAME", ""); vi.stubEnv("MOBILOX_BASIC_AUTH_PASSWORD", "");
    const items = await getIntegrationHealth();
    expect(items.find(item => item.key === "mobilox")).toMatchObject({ configured: true, state: "configured" });
    expect(items.some(item => item.key === "vwe")).toBe(false);
    vi.stubEnv("HEXON_SYNC_PASSWORD", "");
    expect((await getIntegrationHealth()).find(item => item.key === "mobilox")?.configured).toBe(false);
  });
});
