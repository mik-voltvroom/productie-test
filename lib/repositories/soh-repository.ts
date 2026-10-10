import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import type { ApiActor } from "@/lib/auth/api";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { createSohCertificate, SohError } from "@/lib/soh/business";
import { validateSohCertificate, type SohReportState, type SohSaveInput } from "@/lib/soh/certificate";
function database() {
  if (!adminDb) throw new SohError("SOH-opslag is niet beschikbaar.", 503);
  return adminDb;
}
export async function getVehicleSohReport(vehicleId: string): Promise<SohReportState> {
  const db = database();
  return db.runTransaction(async transaction => {
    const vehicle = await transaction.get(db.collection("vehicles").doc(vehicleId));
    if (!vehicle.exists) throw new SohError("Voertuig niet gevonden.", 404);
    const pointer = await transaction.get(db.collection("vehicleSohReports").doc(vehicleId));
    if (!pointer.exists) return { report: null, revision: 0 };
    const data = pointer.data()!;
    const snapshot = await transaction.get(db.collection("sohCertificates").doc(data.reportId));
    if (!snapshot.exists) throw new Error("SOH rapport ontbreekt.");
    const report = validateSohCertificate(snapshot.data());
    if (report.vehicleId !== vehicleId || report.id !== snapshot.id) throw new Error("SOH voertuig mismatch.");
    return { report, revision: data.revision };
  });
}
export async function saveVehicleSohReport(vehicleId: string, input: SohSaveInput, actor: ApiActor): Promise<SohReportState> {
  const db = database();
  const vehicleRef = db.collection("vehicles").doc(vehicleId);
  const pointerRef = db.collection("vehicleSohReports").doc(vehicleId);
  const reportRef = db.collection("sohCertificates").doc(randomUUID());
  const auditRef = db.collection("audit_logs").doc();
  return db.runTransaction(async transaction => {
    const vehicle = await transaction.get(vehicleRef);
    if (!vehicle.exists) throw new SohError("Voertuig niet gevonden.", 404);
    const pointer = await transaction.get(pointerRef);
    const revision = pointer.exists ? pointer.data()!.revision : 0;
    if (revision !== input.expectedRevision) throw new SohError("Een collega heeft het rapport gewijzigd. Herlaad het dossier.", 409);
    const now = new Date().toISOString();
    const report = createSohCertificate(normalizeVehicleDocument(vehicleId, vehicle.data()!), input, actor, reportRef.id, now);
    transaction.create(reportRef, report);
    transaction.set(pointerRef, { reportId: report.id, revision: revision + 1 });
    transaction.create(auditRef, { action: "vehicle.soh.validate", entityType: "vehicle", entityId: vehicleId,
      reportId: report.id, actor: { uid: actor.uid, role: actor.role }, outcome: "success", createdAt: now });
    return { report, revision: revision + 1 };
  });
}
