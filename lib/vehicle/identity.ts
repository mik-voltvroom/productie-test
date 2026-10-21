import type { Vehicle } from "@/types";

type VehicleIdentity = Pick<Vehicle, "vin" | "licensePlate">;

function normalizedIdentity(value: string | undefined): string | undefined {
  const normalized = value?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || undefined;
}

export function vehicleIdentityKeys(vehicle: VehicleIdentity): string[] {
  const vin = normalizedIdentity(vehicle.vin);
  const licensePlate = normalizedIdentity(vehicle.licensePlate);
  return [
    ...(vin ? ["vin:" + vin] : []),
    ...(licensePlate ? ["plate:" + licensePlate] : []),
  ];
}

export function deduplicateVehiclesByIdentity<T extends VehicleIdentity>(vehicles: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const vehicle of vehicles) {
    const keys = vehicleIdentityKeys(vehicle);
    if (keys.some(key => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    result.push(vehicle);
  }
  return result;
}
