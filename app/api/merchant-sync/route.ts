import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";

export async function POST(request: Request) {
  const auth = await authorizeApi(request, "integrations.manage");
  if (auth.response) return auth.response;
  const configured = Boolean(process.env.GOOGLE_MERCHANT_ID && process.env.GOOGLE_MERCHANT_DATASOURCE);
  if (!configured) {
    await writeAuditEvent({ action: "merchant.sync_requested", entityType: "integration", entityId: "merchant", actor: auth.actor, outcome: "warning", metadata: { configured: false }, request });
    return NextResponse.json({ ok: false, mode: "unavailable", status: "not_started", message: "Merchant-credentials ontbreken; er is geen synchronisatie gestart." }, { status: 503 });
  }
  const count = adminDb ? (await adminDb.collection("vehicles").where("status", "==", "available").get()).size : 0;
  await writeAuditEvent({ action: "merchant.sync_rejected", entityType: "integration", entityId: "merchant", actor: auth.actor, outcome: "warning", metadata: { configured: true, eligibleVehicles: count, transportVerified: false }, request });
  return NextResponse.json({ ok: false, mode: "configured-unverified", status: "not_started", eligibleVehicles: count, message: "Merchant-configuratie is aanwezig, maar er is nog geen geverifieerde externe push uitgevoerd." }, { status: 503 });
}
