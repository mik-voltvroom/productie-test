import { describe, expect, it } from "vitest";
import { validateVehicle } from "@/lib/business";
import { createVehicleFeed } from "@/lib/merchant";
import { getPublicVehicleImages, preservePublicImageSelection } from "@/lib/vehicle/photos";
import type { Vehicle } from "@/types";

const first = "https://images.example.test/front.jpg";
const second = "https://images.example.test/interior.jpg";

function vehicle(publicImageUrls?: string[]): Vehicle {
  return {
    id: "VV-photo-test",
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

describe("VVOS fotoselectie", () => {
  it("houdt bestaande voertuigen backwards compatible zolang geen selectie is opgeslagen", () => {
    expect(getPublicVehicleImages(vehicle())).toEqual([first, second]);
  });

  it("publiceert alleen geselecteerde foto's en behoudt de interne volgorde", () => {
    expect(getPublicVehicleImages(vehicle([second]))).toEqual([second]);
    expect(getPublicVehicleImages(vehicle([second, "https://unknown.test/photo.jpg"]))).toEqual([second]);
  });

  it("behandelt een lege expliciete selectie als alleen intern", () => {
    const internalOnly = vehicle([]);
    expect(getPublicVehicleImages(internalOnly)).toEqual([]);
    expect(validateVehicle(internalOnly)).toContain("Selecteer minimaal één foto voor online publicatie");
  });

  it("gebruikt nooit een interne foto in de Merchant-feed", () => {
    const feed = createVehicleFeed([vehicle([second])], "https://www.voltvroom.nl");
    expect(feed).toContain(second);
    expect(feed).not.toContain(first);
  });

  it("neemt een voertuig zonder online foto niet op in de Merchant-feed", () => {
    const feed = createVehicleFeed([vehicle([])], "https://www.voltvroom.nl");
    expect(feed).not.toContain("VV-photo-test");
  });

  it("behoudt een handmatige selectie bij een providerupdate en zet nieuwe foto's niet vanzelf online", () => {
    const selection = preservePublicImageSelection(vehicle([second]).publication, [second, "https://images.example.test/new.jpg"]);
    expect(selection).toEqual([second]);
    expect(preservePublicImageSelection(vehicle().publication, [first, second])).toBeUndefined();
  });
});
