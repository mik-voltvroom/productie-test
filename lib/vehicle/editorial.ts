import { sourceSpecificationKeys } from "./source-specifications";
import { z } from "zod";
import type { Vehicle, VehicleImage } from "@/types";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";

export const MAX_IMPORTED_PHOTOS = 200;
export const optionKey = (label: string) => label.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
export const uniqueOptions = (labels: string[]) => [...new Map(labels.map(label => [optionKey(label), label.trim()])).values()].filter(Boolean);

export function publicOptions(vehicle: Vehicle): string[] {
  if (vehicle.source?.contentVersion === 1 || !vehicle.editorial) return uniqueOptions(vehicle.highlights);
  const selected = new Set(vehicle.editorial.publishedOptionKeys);
  return uniqueOptions(vehicle.highlights).filter(label => selected.has(optionKey(label)));
}

/** Explicit allowlist also excludes legacy raw/imageUrls fields at runtime. */
export function publicVehicleProjection(vehicle: Vehicle): Vehicle {
  const keys = [...sourceSpecificationKeys, "id", "slug", "brand", "model", "trim", "year", "mileageKm", "priceCents", "monthlyPriceCents",
    "driveType", "fuelType", "transmission", "bodyStyle", "color", "batteryHealthPercent", "electricRangeKm",
    "consumptionPer100Km", "annualSavingCents", "warrantyMonths", "maintenanceHistory", "vin", "licensePlate",
    "status", "locationCode", "createdAt", "updatedAt", "wltpRangeKm", "roadTax"] as const;
  const result = Object.fromEntries(keys.filter(key => vehicle[key] !== undefined).map(key => [key, vehicle[key]]));
  return { ...result, images: getPublicVehicleImages(vehicle), highlights: publicOptions(vehicle),
    description: vehicle.source?.contentVersion === 1 ? vehicle.description : vehicle.editorial?.content.websiteText ?? vehicle.description } as Vehicle;
}

/** Called inside the import transaction, against its latest document snapshot. */
export function mergeImportedEditorial(_current: Vehicle | undefined, incoming: Vehicle, photos: VehicleImage[]): Vehicle {
  // The incoming full vehicle snapshot is authoritative, including absent optional fields.
  // No current public fields or editorial selections survive this replacement.
  const { editorial: sourceEditorial, ...source } = incoming;
  return { ...source, images: photos.map(photo => photo.url), highlights: uniqueOptions(incoming.highlights),
    editorial: { version: 1, revision: 0, photos,
      publishedOptionKeys: uniqueOptions(incoming.highlights).map(optionKey),
      content: { sourceTexts: sourceEditorial?.content.sourceTexts ?? {} } } };
}

const keyList = z.array(z.string().min(1).max(4096)).max(2000);
export const editorialCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reorder"), ids: keyList, revision: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("visibility"), id: z.string().min(1).max(4096), online: z.boolean(), revision: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("delete"), id: z.string().min(1).max(4096), revision: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("add"), url: z.string().url().max(4096).refine(value => value.startsWith("https://")), revision: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("options"), keys: keyList, revision: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("addOption"), label: z.string().trim().min(1).max(120), revision: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("text"), text: z.string().max(30000), revision: z.number().int().nonnegative() }).strict(),
]);
export type EditorialCommand = z.infer<typeof editorialCommandSchema>;
export class EditorialConflict extends Error {}

export function applyEditorialCommand(_vehicle: Vehicle, _command: EditorialCommand, _now: string): Vehicle {
  throw new EditorialConflict("Openbare voertuiggegevens worden uitsluitend in Mobilox beheerd.");
}
