import { randomUUID, createHash } from "node:crypto";
import type { ApiActor } from "@/lib/auth/api";
import { requireServerDatabase } from "@/lib/repositories/server-collection";
import { CrmError, type CrmCollection } from "@/lib/crm/business";

export async function readCrm(collection: "leads" | CrmCollection, leadId?: string) {
  const db = requireServerDatabase();
  const source = db.collection(collection);
  const result = await (leadId ? source.where("leadId", "==", leadId) : source).get();
  return result.docs.map(document => ({ ...document.data(), id: document.id }));
}

export async function updateLead(id: string, patch: Record<string, unknown>, actor: ApiActor) {
  const db = requireServerDatabase();
  const ref = db.collection("leads").doc(id);
  const activity = db.collection("leadActivities").doc(randomUUID());
  await db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists) throw new CrmError("Lead niet gevonden.", 404);
    const now = new Date().toISOString();
    transaction.update(ref, { ...patch, updatedAt: now });
    transaction.create(activity, { id: activity.id, leadId: id, type: "status_change", summary: "Opvolging bijgewerkt",
      changes: patch, createdAt: now, createdBy: actor.uid });
  });
}

export async function saveCrm(collection: CrmCollection, record: Record<string, unknown> & { id: string; leadId: string }, actor: ApiActor) {
  const db = requireServerDatabase();
  const ref = db.collection(collection).doc(record.id);
  const inputHash = createHash("sha256").update(JSON.stringify(record)).digest("hex");
  await db.runTransaction(async transaction => {
    const lead = await transaction.get(db.collection("leads").doc(record.leadId));
    const current = await transaction.get(ref);
    if (!lead.exists) throw new CrmError("Lead niet gevonden.", 404);
    if (current.exists) {
      if (current.data()?.leadId !== record.leadId) throw new CrmError("Record hoort bij een andere lead.", 409);
      if (current.data()?.inputHash !== inputHash) throw new CrmError("Deze recordcode bestaat met andere gegevens. Herlaad het dossier.", 409);
      // Creation IDs are retry keys. Existing contact history is immutable.
      return;
    }
    if (record.vehicleId && record.vehicleId !== lead.data()?.vehicleId) throw new CrmError("Voertuig hoort niet bij deze aanvraag.", 409);
    const now = new Date().toISOString();
    transaction.create(ref, { ...record, inputHash, ...(collection === "leadActivities" ? { createdAt: now, createdBy: actor.uid } : {}), updatedAt: now });
    if (collection === "leadActivities" && ["call", "email", "whatsapp"].includes(String(record.type))) {
      transaction.update(lead.ref, { lastContactAt: now, updatedAt: now });
    }
  });
}
