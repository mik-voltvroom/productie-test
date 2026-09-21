import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("publieke voorraadpagina", () => {
  it("projecteert prijs, foto en detail-link vanuit het canonieke voertuigmodel", () => {
    const inventoryPage = read("app/voorraad/page.tsx");

    expect(inventoryPage).toContain('@/lib/repositories/public-vehicle-repository');
    expect(inventoryPage).toContain("listPublicVehicles(100)");
    expect(inventoryPage).toContain("isIconsCollection ? isIconVehicle : isVvOfferVehicle");
    expect(inventoryPage).toContain("vehicle.images[0]");
    expect(inventoryPage).toContain("centsToEuros(vehicle.priceCents)");
    expect(inventoryPage).toContain("vehicle.slug");
    expect(inventoryPage).not.toContain('@/lib/public-vehicles');
  });

  it("scheidt online advertentiefoto's van interne dossierfoto's", () => {
    const form = read("components/dashboard/VehicleForm.tsx");
    const repository = read("lib/repositories/public-vehicle-repository.ts");
    const merchant = read("lib/merchant.ts");
    const hexon = read("lib/integrations/hexon-service.ts");

    expect(form).toContain("Online tonen");
    expect(form).toContain("Alleen intern");
    expect(form).toContain("Nieuwe foto’s blijven eerst alleen intern");
    expect(repository).toContain("getPublicVehicleImages");
    expect(merchant).toContain("getPublicVehicleImages");
    expect(hexon).toContain("preservePublicImageSelection");
  });
});
