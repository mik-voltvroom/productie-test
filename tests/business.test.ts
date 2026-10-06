import { describe, expect, it } from "vitest";
import { grossMargin, marginPercent, slugify, totalCosts, validateVehicle } from "@/lib/business";
import type { VehicleCosts } from "@/types";

const costs: VehicleCosts = {
  purchasePriceCents: 2000000,
  transportCents: 20000,
  preparationCents: 30000,
  maintenanceCents: 50000,
  warrantyReserveCents: 40000,
  advertisingCents: 10000,
  financingCents: 25000,
  otherCents: 5000,
};

describe("vehicle business rules", () => {
  it("calculates total costs and margin deterministically", () => {
    expect(totalCosts(costs)).toBe(2180000);
    expect(grossMargin(2495000, costs)).toBe(315000);
    expect(marginPercent(2495000, costs)).toBeCloseTo(12.625, 3);
  });

  it("creates stable Dutch-friendly slugs", () => {
    expect(slugify("Toyota C-HR 1.8 Hybride Édition")).toBe("toyota-c-hr-1-8-hybride-edition");
  });

  it("blocks incomplete publication data", () => {
    const errors = validateVehicle({ brand: "Toyota", model: "Corolla", driveType: "full-hybrid", images: [] });
    expect(errors).toContain("Minimaal één foto is verplicht");
    expect(errors).toContain("Verkoopprijs ontbreekt");
    expect(errors).not.toContain("Accugezondheid ontbreekt");
  });

  it("does not require high-voltage battery data for combustion vehicles", () => {
    const errors = validateVehicle({
      brand: "Audi", model: "SQ7", trim: "4.0 TDI", year: 2017, mileageKm: 172334,
      priceCents: 3199000, driveType: "combustion", consumptionPer100Km: 7.2,
      images: ["https://images.example.test/audi-sq7.jpg"], locationCode: "GRONINGEN",
    });
    expect(errors).not.toContain("Accugezondheid ontbreekt");
    expect(errors).toEqual([]);
  });
});
