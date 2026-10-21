import { describe, expect, it } from "vitest";
import { isPublishedOnWebsite, isPublishedToMerchant } from "@/lib/vehicle/publication";
import type { Vehicle } from "@/types";

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "VV-test-001",
    slug: "test-auto",
    brand: "Test",
    model: "Auto",
    trim: "Uitvoering",
    year: 2024,
    mileageKm: 12000,
    priceCents: 2500000,
    driveType: "electric",
    fuelType: "Elektrisch",
    transmission: "Automaat",
    bodyStyle: "Hatchback",
    color: "Blauw",
    maintenanceHistory: "complete",
    images: ["https://example.com/test-auto.jpg"],
    highlights: [],
    status: "available",
    locationCode: "GRONINGEN",
    publication: {
      channels: { website: true, merchant: true, google_ads: false, meta: false },
      completenessPercent: 100,
      validationErrors: [],
    },
    updatedAt: "2026-09-24T10:00:00.000Z",
    ...overrides,
  };
}

describe("Google Merchant publicatiegrens", () => {
  it("levert alleen voertuigen waarvan de landingspagina publiek kan laden", () => {
    expect(isPublishedToMerchant(vehicle())).toBe(true);
    expect(isPublishedToMerchant(vehicle({ publication: {
      channels: { website: false, merchant: true, google_ads: false, meta: false },
      completenessPercent: 100,
      validationErrors: [],
    } }))).toBe(false);
  });

  it("blokkeert validatiefouten, ontbrekende publieke foto's en uitgeschakelde Merchant-publicatie", () => {
    expect(isPublishedOnWebsite(vehicle({ images: [] }))).toBe(false);
    expect(isPublishedToMerchant(vehicle({ publication: {
      channels: { website: true, merchant: true, google_ads: false, meta: false },
      completenessPercent: 80,
      validationErrors: ["Prijs ontbreekt"],
    } }))).toBe(false);
    expect(isPublishedToMerchant(vehicle({ publication: {
      channels: { website: true, merchant: false, google_ads: false, meta: false },
      completenessPercent: 100,
      validationErrors: [],
    } }))).toBe(false);
  });
});
