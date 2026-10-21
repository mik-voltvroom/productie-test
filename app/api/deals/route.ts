import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";
import { dealCreateSchema } from "@/lib/deal/model";
import { createDealWithDelivery, DealRepositoryUnavailableError, listDeals } from "@/lib/deal/repository";

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "deals.read");
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ deals: await listDeals() });
  } catch (error) {
    if (error instanceof DealRepositoryUnavailableError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Deals konden niet worden geladen." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi(request, "deals.create");
  if (auth.response) return auth.response;
  const parsed = dealCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige deal", issues: parsed.error.flatten() }, { status: 400 });
  let result;
  try {
    result = await createDealWithDelivery(parsed.data);
  } catch (error) {
    const message = error instanceof DealRepositoryUnavailableError ? error.message : "Deal kon niet transactioneel worden opgeslagen.";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
  const auditRecorded = await writeAuditEvent({ action: "deal.created", entityType: "deal", entityId: result.deal.id, actor: auth.actor, metadata: { leadId: result.deal.leadId, vehicleId: result.deal.vehicleId, totalCents: result.deal.totalCents, deliveryTaskCount: result.tasks.length }, request }).then(() => true).catch(() => false);
  return NextResponse.json({ ...result, mode: "firebase", auditRecorded }, { status: 201 });
}
