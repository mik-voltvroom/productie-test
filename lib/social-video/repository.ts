import { FieldValue, type Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { publicSocialVideoSchema, socialVideoSchema, type PublicSocialVideo, type SocialVideo } from "@/lib/social-video/model";

const COLLECTION = "socialVideos";

export class DuplicateSocialVideoError extends Error {
  constructor() {
    super("Deze socialvideo staat al in VVOS.");
    this.name = "DuplicateSocialVideoError";
  }
}

function requireDb() {
  if (!adminDb) throw new Error("Firestore is niet beschikbaar.");
  return adminDb;
}

function firestoreSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 6 || candidate.code === "already-exists" || String(candidate.message || "").includes("ALREADY_EXISTS");
}

export async function createSocialVideo(video: SocialVideo): Promise<SocialVideo> {
  const parsed = socialVideoSchema.parse(video);
  const safe = firestoreSafe(parsed);
  try {
    await requireDb().collection(COLLECTION).doc(safe.id).create(safe);
  } catch (error) {
    if (isAlreadyExists(error)) throw new DuplicateSocialVideoError();
    throw error;
  }
  return safe;
}

export async function listSocialVideos(): Promise<SocialVideo[]> {
  const snapshot = await requireDb().collection(COLLECTION).orderBy("updatedAt", "desc").limit(250).get();
  return snapshot.docs.map(doc => socialVideoSchema.parse(doc.data()));
}

export async function getSocialVideo(id: string): Promise<SocialVideo | null> {
  const doc = await requireDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? socialVideoSchema.parse(doc.data()) : null;
}

export async function updateSocialVideo(id: string, patch: Partial<SocialVideo>): Promise<SocialVideo> {
  const ref = requireDb().collection(COLLECTION).doc(id);
  const current = await ref.get();
  if (!current.exists) throw new Error("Video niet gevonden.");
  const next = firestoreSafe(socialVideoSchema.parse({ ...current.data(), ...patch, id, updatedAt: new Date().toISOString() }));
  await ref.set(next, { merge: false });
  return next;
}

export async function incrementSocialVideoMetric(id: string, metric: keyof SocialVideo["analytics"]): Promise<boolean> {
  const ref = requireDb().collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.get("status") !== "published") return false;
  await ref.update({ [`analytics.${metric}`]: FieldValue.increment(1) });
  return true;
}

export async function listPublishedSocialVideos(options: { placement?: keyof SocialVideo["placements"]; vehicleId?: string; limit?: number } = {}): Promise<PublicSocialVideo[]> {
  let query: Query = requireDb().collection(COLLECTION).where("status", "==", "published");
  if (options.placement) query = query.where(`placements.${options.placement}`, "==", true);
  if (options.vehicleId) query = query.where("vehicleIds", "array-contains", options.vehicleId);
  const snapshot = await query.limit(Math.min(options.limit ?? 50, 100)).get();
  const records = snapshot.docs
    .map(doc => socialVideoSchema.parse(doc.data()))
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
  return records.map(video => publicSocialVideoSchema.parse(video));
}
