import { createHash } from "node:crypto";
import { adminStorage } from "@/lib/firebase-admin";

const MAX_IMAGE_BYTES = 15_000_000;
export const MAX_IMAGES_PER_VEHICLE = 200;
const DOWNLOAD_BASE = "https://firebasestorage.googleapis.com/v0/b";

function assertSafeRemoteImageUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Alleen HTTPS-afbeeldingen worden geaccepteerd.");

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

  const allowlist = (process.env.HEXON_IMAGE_HOST_ALLOWLIST ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length && !allowlist.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
    throw new Error(`Afbeelding-host ${hostname} staat niet in HEXON_IMAGE_HOST_ALLOWLIST.`);
  }

  return url;
}

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

function downloadUrl(bucketName: string, objectName: string, token: string): string {
  return `${DOWNLOAD_BASE}/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}?alt=media&token=${encodeURIComponent(token)}`;
}

function stableDownloadToken(externalId: string, sourceUrl: string): string {
  return createHash("sha256")
    .update(`${process.env.AUDIT_HASH_SALT ?? "vvos"}:${externalId}:${sourceUrl}`)
    .digest("hex");
}

async function persistOneImage(externalId: string, sourceUrl: string, index: number): Promise<string> {
  if (!adminStorage) throw new Error("Firebase Storage is niet beschikbaar.");
  const url = assertSafeRemoteImageUrl(sourceUrl);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "user-agent": "VoltVroom-Mobilox-Image-Ingest/1.0" },
  });
  if (!response.ok) throw new Error(`Afbeelding ophalen mislukt met HTTP ${response.status}.`);

  const contentType = (response.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) throw new Error(`Onverwacht content-type voor afbeelding: ${contentType}.`);

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw new Error("Afbeelding is groter dan toegestaan.");

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Afbeelding is leeg of groter dan toegestaan.");

  const bucket = adminStorage.bucket();
  const sourceHash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 12);
  const ext = extensionFor(contentType);
  const objectName = `vehicles/${externalId}/mobilox/${String(index + 1).padStart(3, "0")}-${sourceHash}.${ext}`;
  const token = stableDownloadToken(externalId, sourceUrl);
  const file = bucket.file(objectName);

  await file.save(bytes, {
    resumable: false,
    validation: "crc32c",
    metadata: {
      contentType,
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {
        firebaseStorageDownloadTokens: token,
        source: "mobilox-hexon",
        sourceUrl,
      },
    },
  });

  return downloadUrl(bucket.name, objectName, token);
}

export interface PersistedHexonImages {
  images: string[];
  failures: Array<{ sourceUrl: string; message: string }>;
}

export function limitHexonImageUrls(sourceUrls: string[]): string[] {
  return sourceUrls.slice(0, MAX_IMAGES_PER_VEHICLE);
}

/**
 * Mobilox incremental image URLs are temporary. Copy them into VVOS-owned
 * Firebase Storage immediately and return durable download URLs. A failed image
 * is omitted instead of making the complete vehicle mutation fail; failures are
 * returned so they can be written to the integration audit event.
 */
export async function persistHexonImages(externalId: string, sourceUrls: string[]): Promise<PersistedHexonImages> {
  if (!sourceUrls.length) return { images: [], failures: [] };
  const limited = limitHexonImageUrls(sourceUrls);
  const images: string[] = [];
  const failures: PersistedHexonImages["failures"] = [];

  for (let index = 0; index < limited.length; index += 1) {
    const sourceUrl = limited[index];
    try {
      images.push(await persistOneImage(externalId, sourceUrl, index));
    } catch (error) {
      failures.push({
        sourceUrl,
        message: error instanceof Error ? error.message : "Onbekende fout bij afbeeldingopslag.",
      });
    }
  }

  return { images, failures };
}
