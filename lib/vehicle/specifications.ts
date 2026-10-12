import { numericSourceSpecs, textSourceSpecs } from "./source-specifications";
import type { Vehicle } from "@/types";
import { usableRoadTax } from "./road-tax";
const number = new Intl.NumberFormat("nl-NL");
const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
/** Only mapped source fields; no estimates or missing-as-zero values. */
export function vehicleSpecifications(vehicle: Vehicle): [string, string][] {
  const value = (amount: number | undefined, unit: string) => amount === undefined ? null : `${number.format(amount)} ${unit}`;
  const tax = usableRoadTax(vehicle.roadTax);
  const fields = [
    ["Bouwjaar", value(vehicle.year, "")], ["Kilometerstand", value(vehicle.mileageKm, "km")],
    ["Verkoopprijs", money.format(vehicle.priceCents / 100)], ["Kenteken", vehicle.licensePlate],
    ["Carrosserie", vehicle.bodyStyle], ["Kleur", vehicle.color], ["Brandstof", vehicle.fuelType],
    ["Transmissie", vehicle.transmission], ["Opgegeven verbruik", value(vehicle.consumptionPer100Km, "l/100 km")],
    [vehicle.wltpRangeKm !== undefined ? "Elektrische actieradius (WLTP)" : "Elektrische actieradius (aangeleverd)", value(vehicle.wltpRangeKm ?? vehicle.electricRangeKm, "km")],
    ["Accuconditie (aangeleverd)", value(vehicle.batteryHealthPercent, "%")],
    ["Garantie", value(vehicle.warrantyMonths, "maanden")],
    ["Wegenbelasting per kwartaal (aangeleverd)", tax ? `${money.format(tax.quarterlyMinCents / 100)}${tax.quarterlyMaxCents !== tax.quarterlyMinCents ? ` – ${money.format(tax.quarterlyMaxCents / 100)}` : ""}` : null],
  ];
  for (const [key, definition] of Object.entries(numericSourceSpecs)) fields.push([`${definition.label} (${definition.unit || "aantal"})`, value(vehicle[key as keyof typeof numericSourceSpecs], definition.unit)]);
  for (const [key, definition] of Object.entries(textSourceSpecs)) fields.push([definition.label, vehicle[key as keyof typeof textSourceSpecs]]);
  if (vehicle.fastChargingSupported !== undefined) fields.push(["Snelladen (aangeleverd)", vehicle.fastChargingSupported ? "Ja" : "Nee"]);
  return fields.filter((item): item is [string, string] => typeof item[1] === "string" && !!item[1] && item[1] !== "Onbekend");
}

