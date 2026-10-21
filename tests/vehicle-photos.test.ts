import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateVehicle } from "@/lib/business";
import { createVehicleFeed } from "@/lib/merchant";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import type { Vehicle } from "@/types";

const first = "https://images.example.test/front.jpg";
const second = "https://images.example.test/interior.jpg";

function vehicle(publicImageUrls?: string[]): Vehicle {
  return {
    id: "VV-photo-test",
    source: { provider: "mobilox-hexon", contentVersion: 1 },
    slug: "photo-test",
    brand: "Polestar",
    model: "2",
    trim: "Long Range",
    year: 2025,
    mileageKm: 100,
    priceCents: 3995000,
    driveType: "electric",
    fuelType: "Elektrisch",
    transmission: "Automaat",
    bodyStyle: "Hatchback",
    color: "Blauw",
    maintenanceHistory: "complete",
    images: [first, second],
    highlights: [],
    status: "available",
    locationCode: "GRONINGEN",
    publication: {
      channels: { website: true, merchant: true, google_ads: false, meta: false },
      ...(publicImageUrls !== undefined ? { publicImageUrls } : {}),
      completenessPercent: 100,
      validationErrors: [],
    },
    updatedAt: "2026-09-21T12:00:00.000Z",
  };
}

describe("Mobilox photo publication", () => {
  it("ignores old empty and partial editorial selections", () => {
    expect(getPublicVehicleImages(vehicle([]))).toEqual([first, second]);
    expect(getPublicVehicleImages(vehicle([second]))).toEqual([first, second]);
  });
  it("uses the Mobilox first photo in the merchant feed", () => {
    expect(createVehicleFeed([vehicle([second])], "https://www.voltvroom.nl")).toContain(`<g:image_link>${first}</g:image_link>`);
  });
  it("does not publish an empty source photo set", () => {
    const empty = { ...vehicle(), images: [] };
    expect(validateVehicle(empty)).toContain("Minimaal één foto is verplicht");
    expect(createVehicleFeed([empty], "https://www.voltvroom.nl")).not.toContain("VV-photo-test");
  });
});
