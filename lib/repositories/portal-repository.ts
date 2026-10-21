import { requireServerDatabase } from "@/lib/repositories/server-collection";
import { newPortalToken, portalTokenId, portalAccessActive } from "@/lib/portal/business";
import type { ApiActor } from "@/lib/auth/api";
export class PortalUnavailable extends Error {}
function database() {
  if (process.env.VVOS_PORTAL_ENABLED !== "true") throw new PortalUnavailable("Klantportaal is nog niet geactiveerd.");
  return requireServerDatabase();
}
export async function rotatePortalAccess(dealId: string, actor: ApiActor, revoke: boolean) {
  const db = database();
  const token = newPortalToken();
  const tokenId = portalTokenId(token);
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const pointer = db.collection("dealPortalAccess").doc(dealId);
  await db.runTransaction(async transaction => {
    const deal = await transaction.get(db.collection("deals").doc(dealId));
    const previous = await transaction.get(pointer);
    if (!deal.exists) throw new PortalUnavailable("Verkoopdossier niet beschikbaar.");
    const now = new Date().toISOString();
    if (previous.data()?.tokenId) transaction.update(db.collection("customerPortalTokens").doc(previous.data()!.tokenId), { revokedAt: now });
    if (!revoke) transaction.create(db.collection("customerPortalTokens").doc(tokenId), { dealId, expiresAt, revokedAt: null, createdAt: now });
    transaction.set(pointer, { tokenId: revoke ? null : tokenId, updatedAt: now });
    transaction.create(db.collection("audit_logs").doc(), { action: revoke ? "portal.revoke" : "portal.rotate", entityId: dealId, actor: { uid: actor.uid, role: actor.role }, createdAt: now });
  });
  return revoke ? { expiresAt: null, token: null } : { expiresAt, token };
}
export async function readPortal(token: string) {
  const db = database();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db.runTransaction(async transaction => {
    const access = await transaction.get(db.collection("customerPortalTokens").doc(portalTokenId(token)));
    if (!portalAccessActive(access.data())) return null;
    const deal = await transaction.get(db.collection("deals").doc(access.data()!.dealId));
    if (!deal.exists) return null;
    const data = deal.data()!;
    // Only this customer-safe subset leaves the server. No raw deal, payments,
    // internal tasks, customer contact fields or private document URLs.
    return { reference: deal.id, status: String(data.status), plannedDeliveryAt: typeof data.plannedDeliveryAt === "string" ? data.plannedDeliveryAt : null,
      expiresAt: access.data()!.expiresAt as string };
  });
}
