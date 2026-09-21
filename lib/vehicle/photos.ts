import type { Vehicle, VehiclePublication } from "@/types";

type VehiclePhotoSource = Pick<Vehicle, "images" | "publication">;

function uniqueUrls(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string").map(value => value.trim()).filter(Boolean))];
}

export function hasExplicitPublicImageSelection(publication: VehiclePublication | undefined): boolean {
  return Boolean(publication && Object.prototype.hasOwnProperty.call(publication, "publicImageUrls"));
}

/**
 * Returns the only photos that may be exposed outside VVOS, preserving the
 * canonical order from `vehicle.images`. Existing records without an explicit
 * selection remain backwards compatible and publish all current photos.
 */
export function getPublicVehicleImages(vehicle: VehiclePhotoSource): string[] {
  const images = uniqueUrls(vehicle.images ?? []);
  if (!hasExplicitPublicImageSelection(vehicle.publication)) return images;

  const selected = new Set(uniqueUrls(vehicle.publication?.publicImageUrls ?? []));
  return images.filter(image => selected.has(image));
}

export function isVehicleImagePublic(vehicle: VehiclePhotoSource, imageUrl: string): boolean {
  return getPublicVehicleImages(vehicle).includes(imageUrl);
}

/**
 * Keeps a deliberate human photo selection across provider synchronisations.
 * New or replaced provider photos are internal until a user explicitly opts
 * them in. `undefined` means there was no selection yet and legacy behaviour
 * should remain in place.
 */
export function preservePublicImageSelection(
  publication: VehiclePublication | undefined,
  nextImages: readonly string[],
): string[] | undefined {
  if (!hasExplicitPublicImageSelection(publication)) return undefined;
  const available = new Set(uniqueUrls(nextImages));
  return uniqueUrls(publication?.publicImageUrls ?? []).filter(image => available.has(image));
}
