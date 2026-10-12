import { describe, expect, it } from "vitest";
import { monthlyRoadTaxLabel, showroomAdvertisementUrl } from "@/lib/vehicle/showroom-card";

describe("VVOS showroom card", () => {
  it("generates the vehicle advertisement URL for the QR code", () => {
    expect(showroomAdvertisementUrl("volvo-xc40-2022", "https://www.voltvroom.nl/"))
      .toBe("https://www.voltvroom.nl/voorraad/volvo-xc40-2022");
  });

  it("converts the Mobilox quarterly road-tax range to a labelled monthly indication", () => {
    expect(monthlyRoadTaxLabel({
      quarterlyMinCents: 19_800,
      quarterlyMaxCents: 21_600,
      source: "mobilox-hexon",
      sourceField: "motorrijtuigen_belasting",
      schemaVersion: 2,
    })).toBe("€ 66–72 p/m");
  });

  it("does not invent a road-tax amount when Mobilox has not supplied one", () => {
    expect(monthlyRoadTaxLabel(undefined)).toBe("Niet opgegeven");
  });
});

