import { describe, expect, it } from "vitest";
import { vehicleCardImagePosition } from "@/lib/vehicle/card-photo";

const vehicle = { id: "test-vehicle", images: ["https://example.com/front.jpg"] };

describe("vehicle card framing", () => {
  it("centres photos by default", () => {
    expect(vehicleCardImagePosition(vehicle, {})).toBe("50% 50%");
  });

  it("applies a position only to the configured vehicle and source photo", () => {
    const config = { [vehicle.id]: { imageUrl: vehicle.images[0], x: 35, y: 60 } };
    expect(vehicleCardImagePosition(vehicle, config)).toBe("35% 60%");
    expect(vehicleCardImagePosition({ ...vehicle, id: "another" }, config)).toBe("50% 50%");
    expect(vehicleCardImagePosition({ ...vehicle, images: ["https://example.com/new.jpg"] }, config)).toBe("50% 50%");
  });

  it("bounds invalid positions to prevent exposing empty frame edges", () => {
    expect(vehicleCardImagePosition(vehicle, { [vehicle.id]: { imageUrl: vehicle.images[0], x: -10, y: 150 } })).toBe("0% 100%");
    expect(vehicleCardImagePosition(vehicle, { [vehicle.id]: { imageUrl: vehicle.images[0], x: NaN, y: Infinity } })).toBe("50% 50%");
  });
});
