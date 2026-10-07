import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("publieke voorraadpagina", () => {
  it("projecteert prijs, foto en detail-link vanuit het canonieke voertuigmodel", () => {
    const inventoryPage = read("app/voorraad/page.tsx");
    const inventoryBrowser = read("components/InventoryBrowser.tsx");

    expect(inventoryPage).toContain('@/lib/repositories/public-vehicle-repository');
    expect(inventoryPage).toContain("listPublicVehicles(100)");
    expect(inventoryPage).toContain("<InventoryBrowser vehicles={vehicles}");
    expect(inventoryBrowser).toContain("vehicle.images[0]");
    expect(inventoryBrowser).toContain("centsToEuros(vehicle.priceCents)");
    expect(inventoryBrowser).toContain("vehicle.slug");
    expect(inventoryBrowser).toContain('value="all">Hele voorraad');
    expect(inventoryBrowser).toContain('value="icons"');
    expect(inventoryPage).not.toContain('@/lib/public-vehicles');
  });

  it("uses the canonical Mobilox content across inventory and feeds", () => {
    expect(read("components/dashboard/VehicleForm.tsx")).not.toContain("uploadVehicleImage");
    expect(read("lib/integrations/hexon-service.ts")).toContain("buildMobiloxReplacement");
    expect(read("lib/integrations/hexon-service.ts")).not.toContain("preservePublicImageSelection");
    expect(read("lib/merchant.ts")).toContain("getPublicVehicleImages");
  });
});
