import { describe, expect, it } from "vitest";
import {
  applyVehicleMoneyPatch,
  normalizeVehicleDocument,
  planVehicleMoneyMigration,
} from "@/lib/vehicle/money";

const legacyVehicle = {
  status: "available",
  priceEur: 24_950.5,
  monthlyPriceEur: 429.95,
  annualSavingEur: 1_380,
  costs: {
    purchasePriceEur: 20_000,
    transportEur: 200.25,
    preparationEur: 300,
    maintenanceEur: 500,
    warrantyReserveEur: 400,
    advertisingEur: 100,
    financingEur: 250,
    otherEur: 50,
  },
};

describe("vehicle eurocent migration", () => {
  it("normalizes legacy euro fields without floating-point financial truth", () => {
    const vehicle = normalizeVehicleDocument("VV-1", legacyVehicle);
    expect(vehicle.priceCents).toBe(2_495_050);
    expect(vehicle.monthlyPriceCents).toBe(42_995);
    expect(vehicle.costs?.transportCents).toBe(20_025);
    expect(vehicle.commercial).toMatchObject({ targetMarginCents: 300_000, maxStockDays: 45 });
    expect(vehicle.commercial?.priceHistory).toEqual([
      { priceCents: 2_495_050, effectiveAt: "1970-01-01T00:00:00.000Z", source: "migration" },
    ]);
    expect(vehicle).not.toHaveProperty("priceEur");
    expect(vehicle.costs).not.toHaveProperty("purchasePriceEur");
  });

  it("produces a dry-run plan with readback and exact rollback", () => {
    const plan = planVehicleMoneyMigration("VV-1", legacyVehicle);
    expect(plan.status).toBe("migrate");
    expect(plan.set.priceCents).toBe(2_495_050);
    expect(plan.deletePaths).toContain("costs.purchasePriceEur");

    const migrated = applyVehicleMoneyPatch(legacyVehicle, plan);
    const readback = normalizeVehicleDocument("VV-1", migrated);
    expect(readback.priceCents).toBe(2_495_050);
    expect(readback.costs?.transportCents).toBe(20_025);

    const rolledBack = applyVehicleMoneyPatch(migrated, plan.rollback);
    expect(rolledBack).toEqual(legacyVehicle);
  });

  it("fails closed on conflicting dual-written values", () => {
    expect(() => normalizeVehicleDocument("VV-1", {
      ...legacyVehicle,
      priceCents: 2_000_000,
    })).toThrow("Conflicterende geldvelden");
  });

  it("leaves native cents-only documents as a no-op", () => {
    const centsOnly = applyVehicleMoneyPatch(legacyVehicle, planVehicleMoneyMigration("VV-1", legacyVehicle));
    expect(planVehicleMoneyMigration("VV-1", centsOnly)).toMatchObject({ status: "noop", set: {}, deletePaths: [] });
  });
});
