import "server-only";
import type { Query, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { unstable_noStore as noStore } from "next/cache";

import { adminDb } from "@/lib/firebase-admin";
import { vehicles as demoVehicles } from "@/lib/sample-data";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { deduplicateVehiclesByIdentity } from "@/lib/vehicle/identity";
import { publicVehicleProjection } from "@/lib/vehicle/editorial";
import { isPublishedOnWebsite } from "@/lib/vehicle/publication";
import type { Vehicle } from "@/types";
import { publicInventoryMode } from "@/lib/environment/business";
import { matchesPublicSlug, selectPublicVehicles, validPublicSlug, validVehicleLookup } from "@/lib/vehicle-lookup/business";
import { vehicleIdentityKeys } from "@/lib/vehicle/identity";

export class PublicInventoryUnavailable extends Error {
  constructor() { super("Public inventory unavailable"); this.name = "PublicInventoryUnavailable"; }
}

function publicProjection(vehicle: Vehicle): Vehicle {
  return publicVehicleProjection(vehicle);
}

function newestFirst(left: Vehicle, right: Vehicle): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

async function publicRecords(): Promise<Vehicle[]> {
  // Read the last accepted Mobilox snapshot on every request. Provider failures
  // leave that snapshot intact; no provider credentials reach the browser.
  noStore();
  if (publicInventoryMode(process.env) !== "firebase") {
    return deduplicateVehiclesByIdentity(demoVehicles.filter(vehicle => vehicle.status === "available").sort(newestFirst));
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
        if (isPublishedOnWebsite(vehicle)) vehicles.push(vehicle);
      }
      if (snapshot.docs.length < 250) break;
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
  } catch {
    // Never turn a failed/partial scan into a successful empty or incomplete inventory.
    throw new PublicInventoryUnavailable();
  }
  return selectPublicVehicles(vehicles);
}

export async function listPublicVehicles(limit?: number): Promise<Vehicle[]> {
  return (await publicRecords()).slice(0, limit).map(publicProjection);
}

const componentLimit = 1000;

async function indexedRows(transaction: Transaction, query: Query): Promise<Vehicle[]> {
  const snapshot = await transaction.get(query.limit(componentLimit + 1));
  if (snapshot.docs.length > componentLimit) throw new PublicInventoryUnavailable();
  return snapshot.docs.map(document => {
    const vehicle = normalizeVehicleDocument(document.id, document.data());
    if (!validVehicleLookup(vehicle)) throw new PublicInventoryUnavailable();
    return vehicle;
  });
}

/** Explore the entire identity component, including identities of suppressed duplicates.
 * A-B-C is not equivalent to simply suppressing every neighbour of a newer row. */
async function identityComponent(transaction: Transaction, seeds: Vehicle[]): Promise<Vehicle[]> {
  const rows = new Map(seeds.map(vehicle => [vehicle.id, vehicle]));
  const queried = new Set<string>();
  const available = adminDb!.collection("vehicles").where("status", "==", "available");
  for (;;) {
    const keys = [...new Set([...rows.values()].flatMap(vehicleIdentityKeys))].filter(key => !queried.has(key));
    if (!keys.length) return selectPublicVehicles([...rows.values()]);
    const batch = keys.slice(0, 30);
    batch.forEach(key => queried.add(key));
    for (const vehicle of await indexedRows(transaction, available.where("publicLookup.identityKeys", "array-contains-any", batch))) rows.set(vehicle.id, vehicle);
    if (rows.size > componentLimit) throw new PublicInventoryUnavailable();
  }
}

function checkSlugClaims(selected: Vehicle[], claims: Vehicle[], slug: string): Vehicle[] {
  const target = selected.find(vehicle => matchesPublicSlug(vehicle, slug));
  if (target && claims.some(claim => claim.id !== target.id
    && !vehicleIdentityKeys(claim).some(key => vehicleIdentityKeys(target).includes(key)))) throw new PublicInventoryUnavailable();
  return selected;
}

async function lookup(kind: "slug" | "id", value: string): Promise<Vehicle | undefined> {
  noStore();
  let vehicles: Vehicle[] | undefined;
  if (publicInventoryMode(process.env) !== "firebase") {
    vehicles = await publicRecords();
  } else {
    if (!adminDb) throw new PublicInventoryUnavailable();
    try {
      // One consistent read snapshot: withdrawal, aliases and identity winners agree.
      vehicles = await adminDb.runTransaction(async transaction => {
        const marker = (await transaction.get(adminDb!.collection("seoState").doc("publicVehicleLookup"))).data();
        if (marker?.state !== "ready") {
          // Legacy records have no searchable normalized identity keys. A full consistent
          // scan is necessary until all writers and existing records obey the contract.
          const rows: Vehicle[] = [];
          const query = adminDb!.collection("vehicles").limit(250);
          let cursor: QueryDocumentSnapshot | undefined;
          for (;;) {
            const page = await transaction.get(cursor ? query.startAfter(cursor) : query);
            rows.push(...page.docs.map(document => {
              const raw = { ...document.data(), id: document.id } as Vehicle;
              return isPublishedOnWebsite(raw) ? normalizeVehicleDocument(document.id, document.data()) : raw;
            }));
            if (page.docs.length < 250) break;
            cursor = page.docs[page.docs.length - 1];
          }
          const selected = selectPublicVehicles(rows);
          return kind === "slug" ? checkSlugClaims(selected, rows.filter(vehicle => matchesPublicSlug(vehicle, value)), value) : selected;
        }
        if (marker.version !== 1) throw new PublicInventoryUnavailable();
        let seeds: Vehicle[];
        if (kind === "slug") {
          // Include withdrawn claims: reusing an old URL for a different car must fail closed.
          seeds = await indexedRows(transaction, adminDb!.collection("vehicles").where("publicLookup.slugs", "array-contains", value));
        } else {
          const document = await transaction.get(adminDb!.collection("vehicles").doc(value));
          seeds = document.exists ? [normalizeVehicleDocument(document.id, document.data()!)] : [];
          if (seeds.some(vehicle => !validVehicleLookup(vehicle))) throw new PublicInventoryUnavailable();
        }
        const selected = await identityComponent(transaction, seeds);
        return kind === "slug" ? checkSlugClaims(selected, seeds, value) : selected;
      }, { readOnly: true });
    } catch { throw new PublicInventoryUnavailable(); }
  }
  const matching = vehicles.filter(vehicle => kind === "id" ? vehicle.id === value : matchesPublicSlug(vehicle, value));
  if (matching.length > 1) throw new PublicInventoryUnavailable();
  return matching[0] ? publicProjection(matching[0]) : undefined;
}

/** Historical aliases resolve only to a currently public identity winner. */
export async function getPublicVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
  if (!validPublicSlug(slug)) return undefined;
  return lookup("slug", slug);
}

export async function getPublicVehicleById(id: string): Promise<Vehicle | undefined> {
  if (!id || id.length > 400 || /[/\\\u0000-\u0020]/.test(id) || id === "." || id === "..") return undefined;
  return lookup("id", id);
}
