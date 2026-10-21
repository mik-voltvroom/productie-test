import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";
import {
  DealRepositoryUnavailableError,
  DeliveryTaskNotFoundError,
  InvalidDeliveryTaskTransitionError,
  updateDeliveryTaskStatus,
} from "@/lib/deal/repository";

const schema = z.object({ status: z.enum(["todo", "in_progress", "done", "blocked"]) }).strict();
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9-]+$/);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "delivery.write");
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige taakstatus" }, { status: 400 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Ongeldig taak-id" }, { status: 400 });
  let task;
  try {
    task = await updateDeliveryTaskStatus(id, parsed.data.status);
  } catch (error) {
    if (error instanceof DeliveryTaskNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof InvalidDeliveryTaskTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    const message = error instanceof DealRepositoryUnavailableError ? error.message : "Aflevertaak kon niet worden opgeslagen.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  const auditRecorded = await writeAuditEvent({ action: "delivery_task.status_changed", entityType: "deliveryTask", entityId: id, actor: auth.actor, metadata: { dealId: task.dealId, status: task.status }, request }).then(() => true).catch(() => false);
  return NextResponse.json({ task, mode: "firebase", auditRecorded });
}
