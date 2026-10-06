import { createHash, timingSafeEqual } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { parseHexonMutation } from "@/lib/integrations/hexon";
import { prepareHexonImages } from "@/lib/integrations/hexon-images";
import { vehicleIdentityKeys } from "@/lib/vehicle/identity";
import { buildMobiloxReplacement } from "@/lib/vehicle/mobilox";

import type { Vehicle, VehicleImage } from "@/types";

export const HEXON_MAX_BODY_BYTES = 2_000_000;
export const HEXON_PROCESSOR_VERSION = "6-mobilox-content-guard";

const DUPLICATE_ARCHIVE_REASON = "Vervangen door actueler Mobilox/Hexon-voertuigrecord";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isProviderManagedVehicle(id: string, data: Record<string, unknown>): boolean {
  const provider = String(asRecord(data.source).provider ?? "");
  return ["mobilox-hexon", "mobilox", "hexon"].includes(provider)
    || id.startsWith("hexon-")
    || id.startsWith("mobilox-");
}

function duplicateArchivePatch(data: Record<string, unknown>, winnerId: string, now: string) {
  const publication = asRecord(data.publication);
  const source = asRecord(data.source);
  const existingErrors = Array.isArray(publication.validationErrors)
    ? publication.validationErrors.filter((value): value is string => typeof value === "string")
    : [];
  return {
    status: "archived",
    publication: {
      ...publication,
      channels: { website: false, merchant: false, google_ads: false, meta: false },
      completenessPercent: typeof publication.completenessPercent === "number" ? publication.completenessPercent : 0,
      lastValidatedAt: now,
      validationErrors: [...new Set([...existingErrors, DUPLICATE_ARCHIVE_REASON])],
    },
    updatedAt: now,
    source: { ...source, supersededBy: winnerId, supersededAt: now },
  };
}

async function findDuplicateVehicleRefs(vehicleId: string, vehicle: Pick<Vehicle, "vin" | "licensePlate">) {
  if (!adminDb) return [];
  const matches = new Map<string, DocumentReference>();
  const identities: Array<["vin" | "licensePlate", string]> = [];
  if (vehicle.vin) identities.push(["vin", vehicle.vin]);
  if (vehicle.licensePlate) identities.push(["licensePlate", vehicle.licensePlate]);

  for (const [field, value] of identities) {
    const snapshot = await adminDb.collection("vehicles").where(field, "==", value).limit(10).get();
    for (const document of snapshot.docs) {
      if (document.id !== vehicleId) matches.set(document.id, document.ref);
    }
  }
  return [...matches.values()];
}

export async function reconcileHexonInventoryDuplicates(): Promise<{ scanned: number; archived: number }> {
  if (!adminDb) throw new Error("VVOS database niet beschikbaar.");
  const snapshot = await adminDb.collection("vehicles").where("status", "==", "available").get();
  const candidates = snapshot.docs
    .filter(document => isProviderManagedVehicle(document.id, document.data()) && !document.data().reservedDealId && !document.data().soldDealId)
    .sort((left, right) => {
      const leftTime = Date.parse(String(left.data().updatedAt ?? "")) || 0;
      const rightTime = Date.parse(String(right.data().updatedAt ?? "")) || 0;
      return rightTime - leftTime;
    });

  const identityOwners = new Map<string, string>();
  const duplicates: Array<{ id: string; winnerId: string; data: Record<string, unknown> }> = [];
  for (const document of candidates) {
    const data = document.data();
    const keys = vehicleIdentityKeys({
      vin: typeof data.vin === "string" ? data.vin : undefined,
      licensePlate: typeof data.licensePlate === "string" ? data.licensePlate : undefined,
    });
    const winnerId = keys.map(key => identityOwners.get(key)).find(Boolean);
    if (winnerId) {
      duplicates.push({ id: document.id, winnerId, data });
      continue;
    }
    for (const key of keys) identityOwners.set(key, document.id);
  }

  const now = new Date().toISOString();
  for (let offset = 0; offset < duplicates.length; offset += 400) {
    const batch = adminDb.batch();
    for (const duplicate of duplicates.slice(offset, offset + 400)) {
      batch.set(adminDb.collection("vehicles").doc(duplicate.id), duplicateArchivePatch(duplicate.data, duplicate.winnerId, now), { merge: true });
    }
    await batch.commit();
  }
  return { scanned: candidates.length, archived: duplicates.length };
}


function safeEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyHexonAuthorization(header: string | null): boolean {
  const username = process.env.HEXON_SYNC_USERNAME;
  const password = process.env.HEXON_SYNC_PASSWORD;
  if (!username || !password || !header?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return false;
    return safeEqual(decoded.slice(0, separator), username) && safeEqual(decoded.slice(separator + 1), password);
  } catch {
    return false;
  }
}

export function hexonCredentialsConfigured(): boolean {
  return Boolean(process.env.HEXON_SYNC_USERNAME && process.env.HEXON_SYNC_PASSWORD);
}

export async function processHexonInventoryXml(xml: string): Promise<{ duplicate: boolean; externalId: string; action: string; providerAction: string; archivedDuplicates: number }> {
  if (!adminDb) throw new Error("VVOS database niet beschikbaar.");
  const mutation = parseHexonMutation(xml);
  const payloadHash = createHash("sha256").update(xml).digest("hex");
  const eventHash = createHash("sha256").update(`${HEXON_PROCESSOR_VERSION}\0${xml}`).digest("hex");
  const eventRef = adminDb.doc(`integrationEvents/hexon-${eventHash}`);
  const vehicleRef = adminDb.doc(`vehicles/${mutation.vehicle?.id ?? `hexon-${mutation.externalId}`}`);
  const now = new Date().toISOString();
  let duplicate = false;
  let archivedDuplicates = 0;
  let imageFailures: Array<{ sourceUrl: string; message: string }> = [];
  let importedPhotos: VehicleImage[] = [];

  const [alreadyProcessed, latestVehicle] = await Promise.all([eventRef.get(), vehicleRef.get()]);
  if (alreadyProcessed.exists && latestVehicle.data()?.source?.payloadSha256 === payloadHash) {
    return {
      duplicate: true,
      externalId: mutation.externalId,
      action: mutation.action,
      providerAction: mutation.providerAction,
      archivedDuplicates: 0,
    };
  }

  if (mutation.action === "upsert" && mutation.vehicle?.images.length) {
    const persisted = await prepareHexonImages(mutation.vehicle.images);
    imageFailures = persisted.failures;
    if (imageFailures.length) throw new Error("Mobilox-fotolijst ongeldig; bestaande voertuigdata behouden.");
    importedPhotos = persisted.photos;
    mutation.vehicle.images = persisted.images;
  }

  const duplicateVehicleRefs = mutation.action === "upsert" && mutation.vehicle
    ? await findDuplicateVehicleRefs(vehicleRef.id, mutation.vehicle)
    : [];

  await adminDb.runTransaction(async transaction => {
    const event = await transaction.get(eventRef);
    const current = await transaction.get(vehicleRef);
    if (event.exists && current.data()?.source?.payloadSha256 === payloadHash) {
      duplicate = true;
      return;
    }

    const duplicateSnapshots = await Promise.all(duplicateVehicleRefs.map(reference => transaction.get(reference)));
    if (mutation.action === "archive") {
      if (current.exists) {
        transaction.set(vehicleRef, {
          status: current.data()?.soldDealId ? "sold" : current.data()?.reservedDealId ? "reserved" : "archived",
          publication: {
            channels: { website: false, merchant: false, google_ads: false, meta: false },
            completenessPercent: current.data()?.publication?.completenessPercent ?? 0,
            lastValidatedAt: now,
            validationErrors: ["Niet langer geselecteerd in Mobilox/Hexon"],
          },
          updatedAt: now,
          source: { provider: "mobilox-hexon", inventoryStatus: "archived", externalId: mutation.externalId, lastMutationAt: now, payloadSha256: payloadHash },
        }, { merge: true });
      }
    } else {
      if (!mutation.vehicle) throw new Error("Hexon voertuigdata ontbreekt.");
      for (const duplicateSnapshot of duplicateSnapshots) {
        const duplicateData = duplicateSnapshot.data();
        if (!duplicateData || !isProviderManagedVehicle(duplicateSnapshot.id, duplicateData) || duplicateData.status === "archived" || duplicateData.reservedDealId || duplicateData.soldDealId) continue;
        transaction.set(duplicateSnapshot.ref, duplicateArchivePatch(duplicateData, vehicleRef.id, now), { merge: true });
        archivedDuplicates += 1;
      }
      const currentData = current.data();
      const replacement = buildMobiloxReplacement(current.exists ? currentData as Vehicle : undefined,
        mutation.vehicle, importedPhotos, now, mutation.contentPresence);
      replacement.source!.payloadSha256 = payloadHash;
      transaction.set(vehicleRef, replacement);
    }

    transaction.set(eventRef, {
      provider: "mobilox-hexon",
      type: `vehicle.${mutation.providerAction}`,
      operation: mutation.action,
      providerAction: mutation.providerAction,
      externalId: mutation.externalId,
      payloadSha256: payloadHash,
      processorVersion: HEXON_PROCESSOR_VERSION,
      receivedAt: now,
      processedAt: now,
      imageFailures: imageFailures.slice(0, 20),
      result: imageFailures.length ? "accepted_with_image_warnings" : "accepted",
      archivedDuplicates,
    });
  });

  return { duplicate, externalId: mutation.externalId, action: mutation.action, providerAction: mutation.providerAction, archivedDuplicates };
}
