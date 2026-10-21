import { adminDb } from "@/lib/firebase-admin";
import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";

export function requireServerDatabase() {
  if (!productionDataEnabled() || !adminDb) throw new Error("Duurzame opslag is niet beschikbaar.");
  return adminDb;
}

export function productionDataEnabled(): boolean {
  return process.env.VVOS_DATA_MODE === "firebase" && Boolean(adminDb);
}

export async function listServerCollection<T>(collectionName: string, fallback: T[]): Promise<T[]> {
  if (isLocalDemoAuthBypassAllowed()) return fallback;
  const snapshot = await requireServerDatabase().collection(collectionName).orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as T);
}

export async function createServerDocument<T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  value: T,
): Promise<T & { id: string }> {
  const record = { ...value, id };
  await requireServerDatabase().collection(collectionName).doc(id).create(record);
  return record;
}

export async function updateServerDocument<T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  patch: T,
): Promise<void> {
  await requireServerDatabase().collection(collectionName).doc(id).update({ ...patch, updatedAt: new Date().toISOString() });
}
