import type { Vehicle } from "@/types";
import { vehicleRange } from "@/lib/vehicle/range";
import type { ApiActor } from "@/lib/auth/api";
import { sohSaveSchema, validateSohCertificate, vehicleSohSnapshotSchema, type SohSaveInput, type SohVehicleSnapshot } from "./certificate";
export class SohError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
/** Only existing Vehicle data; never infer usable kWh from Ah or SOH. */
export function sohVehicleSnapshot(vehicle: Vehicle): SohVehicleSnapshot {
  const battery: SohVehicleSnapshot["battery"] = [];
  const number = (label: string, value: number | undefined, unit: string) => {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0)
      battery.push({ label, value: `${value.toLocaleString("nl-NL")} ${unit}` });
  };
  number("Accuconditie (Mobilox-opgave)", vehicle.batteryHealthPercent, "%");
  if (vehicle.wltpRangeKm === undefined && vehicle.rangeOverrides?.wltpRangeKm === undefined)
    number("Elektrische actieradius (opgave)", vehicle.electricRangeKm, "km");
  number(vehicle.rangeOverrides?.wltpRangeKm !== undefined ? "WLTP (intern ingevuld)" : "WLTP (Mobilox-opgave)", vehicleRange(vehicle, "wltpRangeKm"), "km");
  number(vehicle.rangeOverrides?.realisticRangeKm !== undefined ? "Praktijkbereik (intern ingevuld)" : "Praktijkbereik (Mobilox Eigen identificatie)", vehicleRange(vehicle, "realisticRangeKm"), "km");
  number("Laadvermogen (opgave)", vehicle.chargingPowerKw, "kW");
  if (vehicle.connector) battery.push({ label: "Stekkeraansluiting", value: vehicle.connector });
  const firstPhoto = vehicle.images?.[0];
  const photoUrl = firstPhoto && /^https?:\/\//i.test(firstPhoto) ? firstPhoto : null;
  return vehicleSohSnapshotSchema.parse({
    brand: vehicle.brand, model: vehicle.model, trim: vehicle.trim ?? "", year: vehicle.year,
    mileageKm: vehicle.mileageKm, licensePlate: vehicle.licensePlate ?? null, vin: vehicle.vin ?? null,
    photoUrl, battery, sourceUpdatedAt: vehicle.updatedAt,
  });
}
export function createSohCertificate(vehicle: Vehicle, input: SohSaveInput, actor: ApiActor, id: string, now: string) {
  const parsed = sohSaveSchema.parse(input);
  if (vehicle.updatedAt !== parsed.expectedVehicleUpdatedAt)
    throw new SohError("Voertuiggegevens zijn gewijzigd. Herlaad het dossier vóór validatie.", 409);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  if (parsed.measuredAt > today) throw new SohError("De meetdatum mag niet in de toekomst liggen.", 400);
  return validateSohCertificate({
    version: 1, id, vehicleId: vehicle.id, measuredAt: parsed.measuredAt,
    sohPercent: parsed.sohPercent, method: parsed.method, verifiedBy: actor.uid,
    verifiedAt: now, status: "verified", vehicle: sohVehicleSnapshot(vehicle),
  });
}
