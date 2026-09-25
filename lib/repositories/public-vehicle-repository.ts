import "server-only";
import { unstable_noStore as noStore } from "next/cache";

import { adminDb } from "@/lib/firebase-admin";
import { vehicles as demoVehicles } from "@/lib/sample-data";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { deduplicateVehiclesByIdentity } from "@/lib/vehicle/identity";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import { publicVehicleProjection } from "@/lib/vehicle/editorial";
import { isPublishedOnWebsite } from "@/lib/vehicle/publication";
import type { Vehicle } from "@/types";

function publicProjection(vehicle: Vehicle): Vehicle {
  return publicVehicleProjection(vehicle);
}

function newestFirst(left: Vehicle, right: Vehicle): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export async function listPublicVehicles(limit = 12): Promise<Vehicle[]> {
  // VVOS saves directly to Firestore. Read current publication data on each
  // request so photo order/visibility changes cannot remain in a cached page.
  noStore();
  if (process.env.VVOS_DATA_MODE !== "firebase") {
    return deduplicateVehiclesByIdentity(demoVehicles.filter(vehicle => vehicle.status === "available").map(publicProjection).sort(newestFirst)).slice(0, limit);
  }
  if (!adminDb) return [];

  let snapshot;
  try {
    snapshot = await adminDb.collection("vehicles").where("status", "==", "available").get();
  } catch (error) {
    console.error("Public inventory unavailable", error instanceof Error ? error.message : "unknown error");
    return [];
  }
  const vehicles: Vehicle[] = [];
  for (const document of snapshot.docs) {
    try {
      const vehicle = normalizeVehicleDocument(document.id, document.data());
      if (isPublishedOnWebsite(vehicle)) vehicles.push(publicProjection(vehicle));
    } catch (error) {
      console.error("Public vehicle skipped", document.id, error instanceof Error ? error.message : "unknown error");
    }
  }
  return deduplicateVehiclesByIdentity(vehicles.sort(newestFirst)).slice(0, limit);
}

export async function getPublicVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
  const vehicles = await listPublicVehicles(100);
  return vehicles.find(vehicle => vehicle.slug === slug);
}
