import { describe, expect, it } from "vitest";
import { isIconVehicle } from "@/lib/vehicle/business";

describe("vehicle collections", () => {
  it("herkent alleen expliciet geselecteerde Icons", () => {
    expect(isIconVehicle({ collection: "icons" })).toBe(true);
    expect(isIconVehicle({})).toBe(false);
  });
});
