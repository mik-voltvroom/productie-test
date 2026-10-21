import { authorizeApi } from "@/lib/auth/api";
import { requireServerDatabase } from "@/lib/repositories/server-collection";
import { sendLeadNotification } from "@/lib/communications/lead-notification";
import { notificationOutcome } from "@/lib/communications/business";
import { z } from "zod";
import { vehicleIdSchema } from "@/lib/contact/business";
export const dynamic = "force-dynamic";
const schema = z.object({ expectedUpdatedAt: z.string().datetime(), acknowledgePossibleDuplicate: z.literal(true) }).strict();
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "communications.send");
  if (auth.response) return auth.response;
  if (!auth.actor) return Response.json({ ok: false }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  const id = vehicleIdSchema.safeParse((await context.params).id);
  if (!input.success || !id.success) return Response.json({ ok: false, error: "Bevestig controle van de eerdere melding." }, { status: 400 });
  try {
    const db = requireServerDatabase();
    const ref = db.collection("leads").doc(id.data);
    const claimedAt = new Date().toISOString();
    const lead = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const value = snapshot.data();
      const stalePending = value?.notification?.status === "pending"
        && Date.parse(value.notification.updatedAt) < Date.now() - 10 * 60 * 1000;
      if (!value || value.notification?.updatedAt !== input.data.expectedUpdatedAt
        || (!stalePending && !["failed", "not_configured"].includes(value.notification?.status))) return null;
      transaction.update(ref, { notification: { status: "pending", updatedAt: claimedAt } });
      transaction.create(db.collection("audit_logs").doc(), { action: "lead.notification.retry", entityId: id.data,
        actor: { uid: auth.actor!.uid, role: auth.actor!.role }, createdAt: claimedAt });
      return value;
    });
    if (!lead) return Response.json({ ok: false, error: "Melding is gewijzigd, al verstuurd of wordt verwerkt. Herlaad de lead." }, { status: 409 });
    const result = await sendLeadNotification({ id: id.data, kind: "lead", name: lead.name, email: lead.email,
      phone: lead.phone, channel: lead.channel, message: lead.message, createdAt: lead.createdAt })
      .catch(() => ({ configured: true, sent: 0, failed: 1 }));
    await ref.update({ notification: { status: notificationOutcome(result), updatedAt: new Date().toISOString() } });
    return Response.json({ ok: true, notification: notificationOutcome(result) });
  } catch { return Response.json({ ok: false, error: "Meldingsresultaat onzeker. Controleer Chat; herhaal niet blind." }, { status: 503 }); }
}
