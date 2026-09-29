import { z } from "zod";
import { createServerDocument, productionDataEnabled } from "@/lib/repositories/server-collection";
import { scoreLead, responseDeadline } from "@/lib/sales-engine";
import { consumePublicLeadQuota } from "@/lib/security/public-rate-limit";
import { sendLeadNotification } from "@/lib/communications/lead-notification";

const leadSchema = z.object({
  vehicleId: z.string().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(40).optional(),
  channel: z.enum(["website", "whatsapp", "phone", "merchant", "other"]).default("website"),
  message: z.string().max(2000).optional(),
  consent: z.literal(true),
  budgetEur: z.number().nonnegative().optional(),
  financingNeeded: z.boolean().optional(),
  hasTradeIn: z.boolean().optional(),
  website: z.string().max(0).optional(),
}).refine(data => data.email || data.phone, { message: "E-mail of telefoonnummer is verplicht." });

export async function POST(request: Request) {
  if (!productionDataEnabled()) {
    return Response.json({ ok: false, error: "Leadopslag is tijdelijk niet beschikbaar." }, { status: 503 });
  }

  const quota = await consumePublicLeadQuota(request);
  if (!quota.allowed) {
    return Response.json(
      { ok: false, error: "Te veel aanvragen in korte tijd. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const { website: _honeypot, ...leadInput } = parsed.data;
  const id = `LEAD-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const sales = scoreLead(leadInput);
  const lead = await createServerDocument("leads", id, {
    ...leadInput,
    status: "new",
    sales: { ...sales, responseDueAt: responseDeadline(sales.score) },
    createdAt: now,
    updatedAt: now,
  });

  const notification = await sendLeadNotification({
    id,
    kind: "lead",
    name: leadInput.name,
    email: leadInput.email,
    phone: leadInput.phone,
    channel: leadInput.channel,
    message: leadInput.message,
    createdAt: now,
  }).catch(() => ({ configured: true, sent: 0, failed: 1 }));
  if (!notification.configured || notification.failed > 0) {
    console.error("Lead notification incomplete", {
      operation: "sendLeadNotification",
      reason: notification.configured ? "provider_failure" : "not_configured",
      failed: notification.failed,
    });
  }

  return Response.json({ ok: true, mode: "firebase", lead }, { status: 201 });
}
