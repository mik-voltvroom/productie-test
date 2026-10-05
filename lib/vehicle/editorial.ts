import { z } from "zod";
import type { Vehicle, VehicleEditorial, VehicleImage } from "@/types";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";

export const MAX_IMPORTED_PHOTOS = 200;
export const optionKey = (label: string) => label.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
export const uniqueOptions = (labels: string[]) => [...new Map(labels.map(label => [optionKey(label), label.trim()])).values()].filter(Boolean);

/** Additive, lazy migration. Old descriptions and selections are never discarded. */
export function editorialFor(vehicle: Vehicle): VehicleEditorial {
  if (vehicle.editorial) return vehicle.editorial;
  return {
    version: 1, revision: 0,
    photos: [...new Set(vehicle.images)].map(url => ({ id: url, url, source: "legacy", importedAt: vehicle.createdAt ?? vehicle.updatedAt })),
    publishedOptionKeys: uniqueOptions(vehicle.highlights).map(optionKey),
    content: { sourceTexts: {}, ...(vehicle.description !== undefined ? { websiteText: vehicle.description } : {}) },
  };
}

export function projectEditorial(vehicle: Vehicle): Vehicle {
  if (!vehicle.editorial) return vehicle;
  return { ...vehicle, images: vehicle.editorial.photos.filter(photo => !photo.deletedAt).map(photo => photo.url),
    description: vehicle.editorial.content.websiteText ?? vehicle.description };
}

export function publicOptions(vehicle: Vehicle): string[] {
  if (!vehicle.editorial) return vehicle.highlights;
  const selected = new Set(vehicle.editorial.publishedOptionKeys);
  return uniqueOptions(vehicle.highlights).filter(label => selected.has(optionKey(label)));
}

/** Explicit allowlist also excludes legacy raw/imageUrls fields at runtime. */
export function publicVehicleProjection(vehicle: Vehicle): Vehicle {
  const keys = ["id", "slug", "brand", "model", "trim", "year", "mileageKm", "priceCents", "monthlyPriceCents",
    "driveType", "fuelType", "transmission", "bodyStyle", "color", "batteryHealthPercent", "electricRangeKm",
    "consumptionPer100Km", "annualSavingCents", "warrantyMonths", "maintenanceHistory", "vin", "licensePlate",
    "status", "locationCode", "createdAt", "updatedAt"] as const;
  const result = Object.fromEntries(keys.filter(key => vehicle[key] !== undefined).map(key => [key, vehicle[key]]));
  return { ...result, images: getPublicVehicleImages(vehicle), highlights: publicOptions(vehicle),
    description: vehicle.editorial?.content.websiteText ?? vehicle.description } as Vehicle;
}

/** Called inside the import transaction, against its latest document snapshot. */
export function mergeImportedEditorial(current: Vehicle | undefined, incoming: Vehicle, photos: VehicleImage[]): Vehicle {
  const base = current ? editorialFor(current) : editorialFor({ ...incoming, images: [] });
  const merged = base.photos.map(photo => ({ ...photo }));
  for (const photo of photos) {
    const existing = merged.find(item => item.id === photo.id || item.url === photo.url
      || (photo.contentHash && item.contentHash === photo.contentHash)
      || (photo.sourceUrl && item.sourceUrl === photo.sourceUrl));
    if (existing) {
      // A repeated source image must never resurrect a manual deletion.
      if (photo.contentHash && !existing.contentHash) existing.contentHash = photo.contentHash;
      if (photo.sourceUrl && !existing.sourceUrl) existing.sourceUrl = photo.sourceUrl;
    } else merged.push(photo);
  }
  const highlights = uniqueOptions([...(current?.highlights ?? []), ...incoming.highlights]);
  const editorial: VehicleEditorial = {
    ...base, photos: merged,
    publishedOptionKeys: current ? base.publishedOptionKeys : highlights.map(optionKey),
    content: { ...base.content, sourceTexts: { ...base.content.sourceTexts, ...incoming.editorial?.content.sourceTexts } },
  };
  const retainedManualShowroomValues = {
    ...(incoming.wltpRangeKm === undefined && current?.wltpRangeKm !== undefined ? { wltpRangeKm: current.wltpRangeKm } : {}),
    ...(incoming.realisticRangeKm === undefined && current?.realisticRangeKm !== undefined ? { realisticRangeKm: current.realisticRangeKm } : {}),
    ...(incoming.roadTax === undefined && current?.roadTax !== undefined ? { roadTax: current.roadTax } : {}),
  };
  // projectEditorial keeps an explicitly edited websiteText. Without such an
  // override, the latest Mobilox advert copy should remain the public source.
  return projectEditorial({ ...incoming, ...retainedManualShowroomValues, highlights, editorial });
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

export function applyEditorialCommand(vehicle: Vehicle, command: EditorialCommand, now: string): Vehicle {
  const original = editorialFor(vehicle);
  if (command.revision !== original.revision) throw new EditorialConflict("Een collega heeft dit dossier gewijzigd. Herlaad en probeer opnieuw.");
  const editorial: VehicleEditorial = { ...original, photos: original.photos.map(photo => ({ ...photo })), content: { ...original.content } };
  const active = editorial.photos.filter(photo => !photo.deletedAt);
  const selected = new Set(vehicle.publication?.publicImageUrls ?? active.map(photo => photo.url));
  if (command.type === "reorder") {
    if (new Set(command.ids).size !== command.ids.length || command.ids.length !== active.length || active.some(photo => !command.ids.includes(photo.id))) {
      throw new EditorialConflict("De fotolijst is gewijzigd. Herlaad het dossier.");
    }
    const byId = new Map(active.map(photo => [photo.id, photo]));
    editorial.photos = [...command.ids.map(id => byId.get(id)!), ...editorial.photos.filter(photo => photo.deletedAt)];
  } else if (command.type === "delete" || command.type === "visibility") {
    const photo = active.find(item => item.id === command.id);
    if (!photo) throw new EditorialConflict("Foto is niet meer beschikbaar.");
    if (command.type === "delete") { photo.deletedAt = now; selected.delete(photo.url); }
    else if (command.online) selected.add(photo.url); else selected.delete(photo.url);
  } else if (command.type === "add") {
    if (!editorial.photos.some(photo => photo.url === command.url)) editorial.photos.push({ id: command.url, url: command.url, source: "manual", importedAt: now });
  } else if (command.type === "options") {
    const allowed = new Set(vehicle.highlights.map(optionKey));
    if (command.keys.some(key => !allowed.has(key))) throw new EditorialConflict("De optielijst is gewijzigd. Herlaad het dossier.");
    editorial.publishedOptionKeys = [...new Set(command.keys)];
  } else if (command.type === "text") editorial.content.websiteText = command.text;
  editorial.revision += 1;
  const next = projectEditorial({ ...vehicle, editorial, updatedAt: now,
    ...(command.type === "addOption" ? { highlights: uniqueOptions([...vehicle.highlights, command.label]) } : {}) });
  next.publication = { ...(vehicle.publication ?? { channels: { website: false, merchant: false, google_ads: false, meta: false }, completenessPercent: 0, validationErrors: [] }), publicImageUrls: next.images.filter(url => selected.has(url)) };
  return next;
}
