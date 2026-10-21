import { NextResponse } from "next/server";
import { z } from "zod";
import type { DealStatus } from "@/types";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";
import { DealNotFoundError, DealReadinessError, DealRepositoryUnavailableError, InvalidDealTransitionError, updateDealStatus, VehicleReservationError } from "@/lib/deal/repository";

const statuses: DealStatus[] = ["draft", "awaiting_signature", "signed", "payment_pending", "paid", "registration", "preparation", "ready", "delivered", "cancelled"];
const schema = z.object({ status: z.enum(statuses as [DealStatus, ...DealStatus[]]) }).strict();
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9-]+$/);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "deals.changeStatus");
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Ongeldig deal-id" }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige dealstatus" }, { status: 400 });
  let deal;
  try {
    deal = await updateDealStatus(id, parsed.data.status);
  } catch (error) {
    if (error instanceof DealNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof InvalidDealTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof DealReadinessError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof VehicleReservationError) return NextResponse.json({ error: error.message }, { status: 409 });
    const message = error instanceof DealRepositoryUnavailableError ? error.message : "Dealstatus kon niet worden opgeslagen.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  const auditRecorded = await writeAuditEvent({ action: "deal.status_changed", entityType: "deal", entityId: id, actor: auth.actor, metadata: { status: parsed.data.status }, request }).then(() => true).catch(() => false);
  return NextResponse.json({ deal, mode: "firebase", auditRecorded });
}
