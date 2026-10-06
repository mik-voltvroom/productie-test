import { adminDb } from "@/lib/firebase-admin";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { applyInternalVehicleUpdate, type InternalVehicleInput } from "@/lib/vehicle/internal";
import type { ApiActor } from "@/lib/auth/api";

export async function updateVehicleInternal(id: string, input: InternalVehicleInput, actor: ApiActor) {
  if (!adminDb) throw new Error("VVOS database niet beschikbaar.");
  const ref = adminDb.collection("vehicles").doc(id);
  const audit = adminDb.collection("audit_logs").doc();
  return adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error("Voertuig niet gevonden.");
    const now = new Date().toISOString();
    const next = applyInternalVehicleUpdate(normalizeVehicleDocument(id, snapshot.data()!), input, now);
    transaction.update(ref, { costs: next.costs!, commercial: next.commercial!, updatedAt: now });
    transaction.create(audit, { action: "vehicle.internal.update", entityType: "vehicle", entityId: id,
      actor, outcome: "success", createdAt: now });
    return next;
  });
}
