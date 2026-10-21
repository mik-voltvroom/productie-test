import { randomUUID } from "node:crypto";
import type { ApiActor } from "@/lib/auth/api";
import { requireServerDatabase } from "@/lib/repositories/server-collection";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { CarCheckError, validateRelease, type CarCheckCommand, type CarCheckReport } from "@/lib/carcheck/business";

export async function readCarCheck(vehicleId: string) {
  const db = requireServerDatabase();
  return db.runTransaction(async transaction => {
    const vehicle = await transaction.get(db.collection("vehicles").doc(vehicleId));
    if (!vehicle.exists) throw new CarCheckError("Voertuig niet gevonden.", 404);
    const pointer = await transaction.get(db.collection("vehicleCarChecks").doc(vehicleId));
    const data = pointer.data();
    const report = data?.reportId ? await transaction.get(db.collection("carCheckReports").doc(data.reportId)) : null;
    const released = data?.releasedId ? await transaction.get(db.collection("carCheckReports").doc(data.releasedId)) : null;
    return { revision: data?.revision ?? 0, report: report?.data() as CarCheckReport ?? null, released: released?.data() as CarCheckReport ?? null };
  });
}
export async function saveCarCheck(vehicleId: string, command: CarCheckCommand, actor: ApiActor) {
  const db = requireServerDatabase();
  const pointerRef = db.collection("vehicleCarChecks").doc(vehicleId);
  const reportRef = db.collection("carCheckReports").doc(randomUUID());
  const auditRef = db.collection("audit_logs").doc(randomUUID());
  return db.runTransaction(async transaction => {
    const vehicleDoc = await transaction.get(db.collection("vehicles").doc(vehicleId));
    const pointer = await transaction.get(pointerRef);
    if (!vehicleDoc.exists) throw new CarCheckError("Voertuig niet gevonden.", 404);
    const vehicle = normalizeVehicleDocument(vehicleId, vehicleDoc.data()!);
    const current = pointer.data();
    if ((current?.revision ?? 0) !== command.expectedRevision || vehicle.updatedAt !== command.expectedVehicleUpdatedAt) {
      throw new CarCheckError("Het voertuig of de inspectie is gewijzigd. Herlaad het dossier.", 409);
    }
    const previous = current?.reportId ? (await transaction.get(db.collection("carCheckReports").doc(current.reportId))).data() as CarCheckReport : null;
    validateRelease(command, previous, vehicle.driveType);
    const ids = new Set([...command.inspection.evidenceIds, ...command.inspection.measurements.flatMap(item => item.evidenceId ? [item.evidenceId] : [])]);
    for (const id of ids) {
      const evidence = await transaction.get(db.collection("carCheckEvidence").doc(id));
      if (!evidence.exists || evidence.data()?.vehicleId !== vehicleId) throw new CarCheckError("Bewijs ontbreekt of hoort bij een ander voertuig.", 400);
    }
    const report: CarCheckReport = { id: reportRef.id, vehicleId, revision: command.expectedRevision + 1,
      status: command.status, inspection: command.inspection, inspectorUid: actor.uid, updatedAt: new Date().toISOString(),
      vehicleUpdatedAt: vehicle.updatedAt, driveType: vehicle.driveType };
    transaction.create(reportRef, report);
    transaction.set(pointerRef, { reportId: report.id, revision: report.revision,
      releasedId: command.status === "released" ? report.id : current?.releasedId ?? null });
    transaction.create(auditRef, { action: `carcheck.${command.status}`, entityId: vehicleId, reportId: report.id,
      actor: { uid: actor.uid, role: actor.role }, createdAt: report.updatedAt });
    return { revision: report.revision, report };
  });
}
