import { describe, expect, it } from "vitest";
import { deduplicateVehiclesByIdentity, vehicleIdentityKeys } from "@/lib/vehicle/identity";

describe("vehicle inventory identity", () => {
  it("normalizes VIN and Dutch license plate formatting", () => {
    expect(vehicleIdentityKeys({ vin: " yv1-abc 123 ", licensePlate: "HXP-41-S" }))
      .toEqual(["vin:YV1ABC123", "plate:HXP41S"]);
  });

  it("keeps the first, already newest vehicle and removes older duplicates", () => {
    const newest = { id: "hexon-new", vin: "YV1ABC123", licensePlate: "HXP-41-S" };
    const old = { id: "mobilox-old", vin: "yv1abc123", licensePlate: "HXP41S" };
    const other = { id: "hexon-other", vin: "YV1OTHER", licensePlate: "P-123-AB" };
    expect(deduplicateVehiclesByIdentity([newest, old, other])).toEqual([newest, other]);
  });

  it("does not collapse vehicles without VIN or license plate", () => {
    const first = { id: "manual-1", vin: undefined, licensePlate: undefined };
    const second = { id: "manual-2", vin: undefined, licensePlate: undefined };
    expect(deduplicateVehiclesByIdentity([first, second])).toEqual([first, second]);
  });
});
