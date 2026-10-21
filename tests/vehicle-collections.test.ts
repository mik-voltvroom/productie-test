import { describe, expect, it } from "vitest";
import { isIconVehicle, isVvOfferVehicle, vehicleCategory } from "@/lib/vehicle/business";

describe("vehicle collections", () => {
  it.each([
    ["electric", "vv-offer"],
    ["full-hybrid", "vv-offer"],
    ["plug-in-hybrid", "vv-offer"],
    ["combustion", "icons"],
  ] as const)("deelt %s automatisch in bij %s", (driveType, category) => {
    expect(vehicleCategory({ driveType })).toBe(category);
  });

  it("houdt regulier VV-aanbod en Icons strikt gescheiden", () => {
    expect(isVvOfferVehicle({ driveType: "electric" })).toBe(true);
    expect(isVvOfferVehicle({ driveType: "full-hybrid" })).toBe(true);
    expect(isVvOfferVehicle({ driveType: "plug-in-hybrid" })).toBe(true);
    expect(isVvOfferVehicle({ driveType: "combustion" })).toBe(false);
    expect(isIconVehicle({ driveType: "combustion" })).toBe(true);
    expect(isIconVehicle({ driveType: "electric" })).toBe(false);
  });
});
