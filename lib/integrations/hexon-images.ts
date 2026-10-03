import { createHash } from "node:crypto";
import { MAX_IMPORTED_PHOTOS } from "@/lib/vehicle/editorial";
import type { VehicleImage } from "@/types";

export const MAX_IMAGES_PER_VEHICLE = MAX_IMPORTED_PHOTOS;
const DEFAULT_IMAGE_HOSTS = ["media-eigenwebsiteincrementeel.export.dv.nl"];

function assertSafeRemoteImageUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Alleen HTTPS-afbeeldingen worden geaccepteerd.");
  if (url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Afbeelding-URL bevat niet-toegestane verbindingsgegevens.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "0.0.0.0"
    || hostname === "::1"
    || hostname.endsWith(".local")
    || hostname === "169.254.169.254"
  ) {
    throw new Error("Lokale afbeelding-hosts zijn niet toegestaan.");
  }

  const allowlist = [...DEFAULT_IMAGE_HOSTS, ...(process.env.HEXON_IMAGE_HOST_ALLOWLIST ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)];
  if (!allowlist.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
    throw new Error(`Afbeelding-host ${hostname} staat niet in HEXON_IMAGE_HOST_ALLOWLIST.`);
  }

  return url;
}

function referenceOneImage(sourceUrl: string): VehicleImage {
  const url = assertSafeRemoteImageUrl(sourceUrl).toString();
  return { id: sourcePhotoId(url), sourceUrl: url, url, source: "mobilox-hexon", importedAt: new Date().toISOString() };
}

function sourcePhotoId(sourceUrl: string): string {
  return createHash("sha256").update(assertSafeRemoteImageUrl(sourceUrl).toString()).digest("hex");
}

export interface PreparedHexonImages {
  images: string[];
  photos: VehicleImage[];
  failures: Array<{ sourceUrl: string; message: string }>;
}

export function limitHexonImageUrls(sourceUrls: string[]): string[] {
  return sourceUrls.slice(0, MAX_IMAGES_PER_VEHICLE);
}

/**
 * Mobilox remains the source and host for imported vehicle photos. VVOS stores
 * only the validated HTTPS references so editorial order, publication choices
 * and tombstones keep working without duplicating the image binary. Invalid
 * URLs are omitted without making the complete vehicle mutation fail.
 */
export async function prepareHexonImages(sourceUrls: string[], existing: VehicleImage[] = []): Promise<PreparedHexonImages> {
  if (!sourceUrls.length) return { images: [], photos: [], failures: [] };
  const knownPhotos = existing;
  const limited = limitHexonImageUrls(sourceUrls);
  const images: string[] = [];
  const photos: VehicleImage[] = [];
  const failures: PreparedHexonImages["failures"] = [];

  for (let index = 0; index < limited.length; index += 1) {
    const sourceUrl = limited[index];
    try {
      const known = knownPhotos.find(photo => photo.sourceUrl === sourceUrl || photo.url === sourceUrl
        || photo.id === sourcePhotoId(sourceUrl));
      const normalizedUrl = assertSafeRemoteImageUrl(sourceUrl).toString();
      const photo = known ? { ...known, sourceUrl: normalizedUrl } : referenceOneImage(normalizedUrl);
      photos.push(photo);
      if (!photo.deletedAt) images.push(photo.url);
    } catch (error) {
      failures.push({
        sourceUrl,
        message: error instanceof Error ? error.message : "Onbekende fout bij de Mobilox-afbeeldingsverwijzing.",
      });
    }
  }

  return { images, photos, failures };
}
