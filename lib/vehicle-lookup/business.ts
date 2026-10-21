import type { Vehicle } from "@/types";
import { vehicleIdentityKeys, deduplicateVehiclesByIdentity } from "@/lib/vehicle/identity";
import { isPublishedOnWebsite } from "@/lib/vehicle/publication";

export interface PublicVehicleLookup {
  version: 1;
  identityKeys: string[];
  /** Current slug plus previously observed public slugs of this same document. */
  slugs: string[];
}

export function validPublicSlug(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 400
    && !/[\u0000-\u001f\u007f]/.test(value) && value !== "." && value !== "..";
}

export function validVehicleLookup(vehicle: Vehicle): boolean {
  const lookup = vehicle.publicLookup;
  const keys = vehicleIdentityKeys(vehicle);
  return lookup?.version === 1 && Array.isArray(lookup.identityKeys) && Array.isArray(lookup.slugs)
    && lookup.identityKeys.length === keys.length && keys.every((key, index) => lookup.identityKeys[index] === key)
    && lookup.slugs.length <= 200 && lookup.slugs.every(validPublicSlug)
    && new Set(lookup.slugs).size === lookup.slugs.length
    && (!validPublicSlug(vehicle.slug) || lookup.slugs.includes(vehicle.slug));
}

/** Only server-observed history survives. Incoming provider metadata is never trusted. */
export function buildVehicleLookup(current: Vehicle | undefined, next: Vehicle): PublicVehicleLookup {
  if (current?.publicLookup && !validVehicleLookup(current)) throw new Error("Invalid vehicle lookup history");
  const nextKeys = vehicleIdentityKeys(next);
  // External stock IDs can be reused. Carry aliases only with positive vehicle identity continuity.
  const sameVehicle = current?.id === next.id && vehicleIdentityKeys(current).some(key => nextKeys.includes(key));
  const history = sameVehicle ? current?.publicLookup?.slugs ?? [] : [];
  const previous = sameVehicle && current && isPublishedOnWebsite(current) && validPublicSlug(current.slug) ? [current.slug] : [];
  const slugs = [...new Set([...history, ...previous, ...(validPublicSlug(next.slug) ? [next.slug] : [])])];
  // Never silently expire old links. A corrupt/runaway history requires investigation.
  if (slugs.length > 200) throw new Error("Vehicle slug history exceeds review limit");
  return { version: 1, identityKeys: nextKeys, slugs };
}

/** Match Firestore's document-name ordering before the existing stable timestamp sort. */
export function selectPublicVehicles(vehicles: readonly Vehicle[]): Vehicle[] {
  const ordered = vehicles.filter(isPublishedOnWebsite).sort((a, b) => {
    const left = Array.from(a.id), right = Array.from(b.id);
    for (let index = 0; index < Math.min(left.length, right.length); index++) {
      const difference = left[index].codePointAt(0)! - right[index].codePointAt(0)!;
      if (difference) return difference;
    }
    return left.length - right.length;
  });
  ordered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return deduplicateVehiclesByIdentity(ordered);
}

export function matchesPublicSlug(vehicle: Vehicle, slug: string): boolean {
  return vehicle.slug === slug || (validVehicleLookup(vehicle) && vehicle.publicLookup!.slugs.includes(slug));
}

export function publicVehicleHref(slug: string, params: Record<string, string | string[] | undefined>): string {
  if (!validPublicSlug(slug)) throw new Error("Invalid public vehicle slug");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  const suffix = query.toString();
  return `/voorraad/${encodeURIComponent(slug)}${suffix ? `?${suffix}` : ""}`;
}
