import { adminDb } from "@/lib/firebase-admin";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { applyEditorialCommand, editorialFor, type EditorialCommand } from "@/lib/vehicle/editorial";
import { fingerprintStoredPhoto } from "@/lib/integrations/storage-server";
import type { ApiActor } from "@/lib/auth/api";

export async function updateVehicleEditorial(id: string, command: EditorialCommand, actor: ApiActor) {
  if (!adminDb) throw new Error("VVOS database niet beschikbaar.");
  const ref = adminDb.collection("vehicles").doc(id);
  const audit = adminDb.collection("audit_logs").doc();
  return adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error("Voertuig niet gevonden.");
    const now = new Date().toISOString();
    const current = normalizeVehicleDocument(id, snapshot.data()!);
    if (command.type === "delete") {
      const editorial = editorialFor(current);
      const photo = editorial.photos.find(item => item.id === command.id);
      if (photo) {
        const fingerprinted = await fingerprintStoredPhoto(photo);
        current.editorial = { ...editorial, photos: editorial.photos.map(item => item.id === photo.id ? fingerprinted : item) };
      }
    }
    const next = applyEditorialCommand(current, command, now);
    transaction.update(ref, {
      editorial: next.editorial!, images: next.images, highlights: next.highlights, publication: next.publication!,
      ...(next.description !== undefined ? { description: next.description } : {}), updatedAt: now,
    });
    transaction.create(audit, { action: `vehicle.editorial.${command.type}`, entityType: "vehicle", entityId: id,
      actor, outcome: "success", createdAt: now, metadata: { revision: next.editorial!.revision } });
    return next;
  });
}
