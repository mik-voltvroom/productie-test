import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { removeUndefinedValues } from "@/lib/firestore-data";

type PersistTradeInInput = {
  leadId: string;
  tradeInId: string;
  lead: Record<string, unknown>;
  tradeIn: Record<string, unknown>;
  photos: File[];
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export class TradeInPersistenceUnavailableError extends Error {
  constructor() {
    super("Inruilopslag is tijdelijk niet beschikbaar.");
  }
}

export async function persistTradeInRequest(input: PersistTradeInInput): Promise<{ photoPaths: string[] }> {
  if (!adminDb || !adminStorage) throw new TradeInPersistenceUnavailableError();

  const bucket = adminStorage.bucket();
  const photoPaths: string[] = [];

  try {
    for (const photo of input.photos) {
      const extension = EXTENSIONS[photo.type];
      if (!extension) throw new Error("Niet-ondersteund fotobestand.");
      const path = "trade-ins/" + input.tradeInId + "/" + crypto.randomUUID() + "." + extension;
      await bucket.file(path).save(Buffer.from(await photo.arrayBuffer()), {
        resumable: false,
        validation: "crc32c",
        metadata: {
          contentType: photo.type,
          cacheControl: "private, no-store",
          metadata: { originalName: photo.name.slice(0, 160) },
        },
      });
      photoPaths.push(path);
    }

    const batch = adminDb.batch();
    batch.set(adminDb.collection("leads").doc(input.leadId), removeUndefinedValues({ ...input.lead, id: input.leadId }));
    batch.set(adminDb.collection("tradeIns").doc(input.tradeInId), removeUndefinedValues({
      ...input.tradeIn,
      id: input.tradeInId,
      photos: photoPaths,
    }));
    await batch.commit();
    return { photoPaths };
  } catch (error) {
    await Promise.all(photoPaths.map(path => bucket.file(path).delete({ ignoreNotFound: true }).catch(() => undefined)));
    throw error;
  }
}
