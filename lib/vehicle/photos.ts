import type { Vehicle, VehiclePublication } from "@/types";

type VehiclePhotoSource = Pick<Vehicle, "images" | "publication" | "editorial" | "source">;

function uniqueUrls(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string").map(value => value.trim()).filter(Boolean))];
}

export function hasExplicitPublicImageSelection(publication: VehiclePublication | undefined): boolean {
  return Boolean(publication && Object.prototype.hasOwnProperty.call(publication, "publicImageUrls"));
}

/**
 * Publishes the canonical Mobilox image list in provider order.
 * Legacy selections remain read-only until a verified source replacement.
 */
export function getPublicVehicleImages(vehicle: VehiclePhotoSource): string[] {
  if (vehicle.source?.contentVersion === 1) return uniqueUrls(vehicle.images);
  // Transition only: until a full verified reimport, do not expose previously
  // internal legacy media by dropping its selection. No new editor can write it.
  const images = uniqueUrls(vehicle.editorial ? vehicle.editorial.photos.filter(photo => !photo.deletedAt).map(photo => photo.url) : vehicle.images);
  if (!hasExplicitPublicImageSelection(vehicle.publication)) return images;
  const selected = new Set(uniqueUrls(vehicle.publication?.publicImageUrls));
  return images.filter(url => selected.has(url));
}

export function isVehicleImagePublic(vehicle: VehiclePhotoSource, imageUrl: string): boolean {
  return getPublicVehicleImages(vehicle).includes(imageUrl);
}
