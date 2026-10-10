import type { Vehicle } from "@/types";

export type RangeField = "wltpRangeKm" | "realisticRangeKm";

/** Internal print/report values; source fields remain authoritative for public inventory. */
export function vehicleRange(vehicle: Vehicle, field: RangeField): number | undefined {
  const override = vehicle.rangeOverrides?.[field];
  return override === undefined ? vehicle[field] : override ?? undefined;
}
