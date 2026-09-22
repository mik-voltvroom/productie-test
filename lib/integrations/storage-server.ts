import { createHash } from "node:crypto";
import { adminStorage } from "@/lib/firebase-admin";
import type { VehicleImage } from "@/types";

/** Backfill fingerprints from our own immutable legacy objects, never an arbitrary remote URL. */
export async function fingerprintStoredPhoto(photo: VehicleImage): Promise<VehicleImage> {
  if (photo.contentHash) return photo;
  let url: URL;
  try { url = new URL(photo.url); } catch { return photo; }
  if (url.hostname !== "firebasestorage.googleapis.com") return photo;
  const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
  if (!match) return photo;
  const objectName = decodeURIComponent(match[2]);
  if (!objectName.startsWith("vehicles/") || !objectName.includes("/mobilox/")) return photo;
  if (!adminStorage) throw new Error("Foto-opslag niet beschikbaar voor migratie.");
  const bucket = adminStorage.bucket();
  if (decodeURIComponent(match[1]) !== bucket.name) throw new Error("Onverwachte opslaglocatie voor bestaande importfoto.");
  const file = bucket.file(objectName);
  const [metadata] = await file.getMetadata();
  if (Number(metadata.size) > 15000000) throw new Error("Bestaande foto overschrijdt de importlimiet.");
  const [bytes] = await file.download();
  const sourceUrl = metadata.metadata?.sourceUrl;
  return { ...photo, contentHash: createHash("sha256").update(bytes).digest("hex"),
    ...(typeof sourceUrl === "string" ? { sourceUrl } : {}) };
}
