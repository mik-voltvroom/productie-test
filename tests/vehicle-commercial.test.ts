import { describe, expect, it } from "vitest";
import {
  defaultVehicleCommercial,
  normalizeVehicleCommercial,
  recordVehiclePrice,
  vehicleCommercialSummary,
} from "@/lib/vehicle/business";
import type { VehicleCosts } from "@/types";

const costs: VehicleCosts = {
  purchasePriceCents: 2_500_000,
  transportCents: 25_000,
  preparationCents: 50_000,
  maintenanceCents: 40_000,
  warrantyReserveCents: 30_000,
  advertisingCents: 10_000,
  financingCents: 20_000,
  otherCents: 5_000,
};

describe("VVOS commercieel voertuigdossier", () => {
  it("normaliseert ontbrekende operationele waarden en bewaart eurocenten", () => {
    expect(normalizeVehicleCommercial({ acquisitionSource: "  Mobilox / Hexon  " })).toEqual({
      ...defaultVehicleCommercial,
      acquisitionSource: "Mobilox / Hexon",
    });
    expect(() => normalizeVehicleCommercial({ targetMarginCents: 299_999.5 })).toThrow("eurocenten");
    expect(() => normalizeVehicleCommercial({ leadCount: -1 })).toThrow("leadCount");
  });

  it("bouwt een begrensd, gededupliceerd prijsverloop op", () => {
    const first = recordVehiclePrice(undefined, 3_199_000, "2026-08-30T12:00:00.000Z", "mobilox-hexon");
    const duplicate = recordVehiclePrice(first, 3_199_000, "2026-08-30T13:00:00.000Z", "mobilox-hexon");
    const changed = recordVehiclePrice(duplicate, 3_149_000, "2026-09-02T08:00:00.000Z", "manual");

    expect(duplicate.priceHistory).toHaveLength(1);
    expect(changed.priceHistory).toEqual([
      { priceCents: 3_199_000, effectiveAt: "2026-08-30T12:00:00.000Z", source: "mobilox-hexon" },
      { priceCents: 3_149_000, effectiveAt: "2026-09-02T08:00:00.000Z", source: "manual" },
    ]);
  });

  it("berekent statijd en definitieve marge uit de centrale voertuigwaarheid", () => {
    const summary = vehicleCommercialSummary({
      priceCents: 3_199_000,
      costs,
      createdAt: "2026-08-01T00:00:00.000Z",
      soldAt: "2026-08-25T00:00:00.000Z",
      commercial: {
        ...defaultVehicleCommercial,
        stockEnteredAt: "2026-08-03T00:00:00.000Z",
        leadCount: 8,
        viewCount: 240,
        soldPriceCents: 3_150_000,
      },
    }, new Date("2026-08-30T00:00:00.000Z"));

    expect(summary).toMatchObject({
      stockDays: 22,
      totalLeadCount: 8,
      totalViewCount: 240,
      marginCents: 470_000,
      targetMarginCents: 300_000,
      costsKnown: true,
      marginOnTarget: true,
    });
  });

  it("laadt het Firebase-voertuigdossier via de repository en niet uit demo-opslag", async () => {
    const detailPage = await import("node:fs/promises").then(fs => fs.readFile("app/dashboard/voorraad/[id]/page.tsx", "utf8"));
    expect(detailPage).toContain('getVehicle } from "@/lib/repositories/vehicle-repository"');
    expect(detailPage).not.toContain("@/lib/demo-store");
  });
});
