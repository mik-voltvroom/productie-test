import "server-only";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { unstable_noStore as noStore } from "next/cache";

import { adminDb } from "@/lib/firebase-admin";
import { vehicles as demoVehicles } from "@/lib/sample-data";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { deduplicateVehiclesByIdentity } from "@/lib/vehicle/identity";
import { publicVehicleProjection } from "@/lib/vehicle/editorial";
import { isPublishedOnWebsite } from "@/lib/vehicle/publication";
import type { Vehicle } from "@/types";
import { publicInventoryMode } from "@/lib/environment/business";

export class PublicInventoryUnavailable extends Error {
  constructor() { super("Public inventory unavailable"); this.name = "PublicInventoryUnavailable"; }
}

function publicProjection(vehicle: Vehicle): Vehicle {
  return publicVehicleProjection(vehicle);
}

function newestFirst(left: Vehicle, right: Vehicle): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export async function listPublicVehicles(limit?: number): Promise<Vehicle[]> {
  // Read the last accepted Mobilox snapshot on every request. Provider failures
  // leave that snapshot intact; no provider credentials reach the browser.
  noStore();
  if (publicInventoryMode(process.env) !== "firebase") {
    return deduplicateVehiclesByIdentity(demoVehicles.filter(vehicle => vehicle.status === "available").map(publicProjection).sort(newestFirst)).slice(0, limit);
  }
  if (!adminDb) throw new PublicInventoryUnavailable();
  const vehicles: Vehicle[] = [];
  try {
    // Firestore defaults to document ID ordering. Cursor reads need no new composite index.
    const query = adminDb.collection("vehicles").where("status", "==", "available").limit(250);
    let cursor: QueryDocumentSnapshot | undefined;
    for (;;) {
      const snapshot = await (cursor ? query.startAfter(cursor) : query).get();
      for (const document of snapshot.docs) {
        const vehicle = normalizeVehicleDocument(document.id, document.data());
        if (isPublishedOnWebsite(vehicle)) vehicles.push(publicProjection(vehicle));
      }
      if (snapshot.docs.length < 250) break;
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
  } catch {
    // Never turn a failed/partial scan into a successful empty or incomplete inventory.
    throw new PublicInventoryUnavailable();
  }
  return deduplicateVehiclesByIdentity(vehicles.sort(newestFirst)).slice(0, limit);
}

export async function getPublicVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
  const vehicles = await listPublicVehicles();
  const matching = vehicles.filter(vehicle => vehicle.slug === slug);
  // Ambiguous source slugs must not serve an arbitrary price or Offer.
  if (matching.length > 1) throw new PublicInventoryUnavailable();
  return matching[0];
}

/** Direct lookup avoids the public inventory list's pagination limit. */
export async function getPublicVehicleById(id: string): Promise<Vehicle | undefined> {
  noStore();
  if (publicInventoryMode(process.env) !== "firebase") {
    const vehicle = demoVehicles.find(candidate => candidate.id === id && candidate.status === "available");
    return vehicle ? publicProjection(vehicle) : undefined;
  }
  if (!adminDb) throw new Error("Vehicle storage unavailable");
  const document = await adminDb.collection("vehicles").doc(id).get();
  if (!document.exists) return undefined;
  const vehicle = normalizeVehicleDocument(document.id, document.data() ?? {});
  return isPublishedOnWebsite(vehicle) ? publicProjection(vehicle) : undefined;
}
