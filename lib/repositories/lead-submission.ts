import { createHash } from "node:crypto";
import { requireServerDatabase } from "@/lib/repositories/server-collection";

export class SubmissionConflict extends Error {}
export async function replayedLead(key: string, input: unknown) {
  const ref = requireServerDatabase().collection("leadSubmissions").doc(createHash("sha256").update(key).digest("hex"));
  const existing = await ref.get();
  if (!existing.exists) return null;
  if (existing.data()?.fingerprint !== createHash("sha256").update(JSON.stringify(input)).digest("hex")) throw new SubmissionConflict("Aanvraagcode is al gebruikt voor andere gegevens.");
  return existing.data()!.leadId as string;
}
/** A random browser submission key, not a contact fingerprint: a new legitimate
 * enquiry receives a new key. The record and retry marker commit atomically. */
export async function createLeadOnce(key: string, input: unknown, id: string, record: Record<string, unknown>) {
  const db = requireServerDatabase();
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const marker = db.collection("leadSubmissions").doc(createHash("sha256").update(key).digest("hex"));
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(marker);
    if (existing.exists) {
      if (existing.data()?.fingerprint !== fingerprint) throw new SubmissionConflict("Aanvraagcode is al gebruikt voor andere gegevens.");
      return { created: false, id: existing.data()!.leadId as string };
    }
    transaction.create(db.collection("leads").doc(id), { ...record, id });
    transaction.create(marker, { leadId: id, fingerprint, createdAt: record.createdAt });
    return { created: true, id };
  });
}
