import { describe, expect, it } from "vitest";
import type { Vehicle } from "@/types";
import { calculateOpportunityScore } from "@/lib/vehicle/opportunity";

const vehicle: Vehicle = {
  id: "test-1", slug: "toyota-rav4", brand: "Toyota", model: "RAV4", trim: "2.5 Hybrid",
  year: 2022, mileageKm: 50000, priceCents: 32_950_00, driveType: "full-hybrid", fuelType: "Benzine / Hybride",
  transmission: "Automaat", bodyStyle: "SUV", color: "Grijs", maintenanceHistory: "complete", images: [], highlights: [],
  status: "available", locationCode: "GRONINGEN", updatedAt: "2026-09-01T00:00:00.000Z",
  costs: { purchasePriceCents: 28_000_00, transportCents: 20_000, preparationCents: 40_000, maintenanceCents: 30_000, warrantyReserveCents: 20_000, advertisingCents: 10_000, financingCents: 0, otherCents: 0 },
  commercial: { targetMarginCents: 300_000, maxStockDays: 45, viewCount: 0, leadCount: 0, priceHistory: [], stockEnteredAt: "2026-09-01T00:00:00.000Z" },
};

describe("Opportunity Score v1", () => {
  it("returns a strong buy for a high-margin scarce low-risk fast seller", () => {
    const result = calculateOpportunityScore(vehicle, { marketPricePositionPercent: -4, expectedStockDays: 22, comparableSupplyCount: 5, technicalRiskScore: 10 });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.advice).toBe("STRONG_BUY");
    expect(result.missingInputs).toEqual([]);
  });

  it("does not invent unavailable market data", () => {
    const result = calculateOpportunityScore(vehicle);
    expect(result.missingInputs).toContain("marketPricePositionPercent");
    expect(result.missingInputs).toContain("expectedStockDays");
    expect(result.version).toBe("v1");
  });
});
