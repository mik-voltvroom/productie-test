import { adminDb } from "@/lib/firebase-admin";

export function productionDataEnabled(): boolean {
  return process.env.VVOS_DATA_MODE === "firebase" && Boolean(adminDb);
}

export async function listServerCollection<T>(collectionName: string, fallback: T[]): Promise<T[]> {
  if (!productionDataEnabled() || !adminDb) return fallback;
  const snapshot = await adminDb.collection(collectionName).orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as T);
}

export async function createServerDocument<T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  value: T,
): Promise<T & { id: string }> {
  const record = { ...value, id };
  if (productionDataEnabled() && adminDb) {
    await adminDb.collection(collectionName).doc(id).set(record, { merge: true });
  }
  return record;
}

export async function updateServerDocument<T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  patch: T,
): Promise<void> {
  if (productionDataEnabled() && adminDb) {
    await adminDb.collection(collectionName).doc(id).set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  }
}
