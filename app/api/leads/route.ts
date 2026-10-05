import { z } from "zod";
import { financialLeaseFields } from "@/lib/financial-lease/validation";
import { calculateLease, eligibleForLease } from "@/lib/financial-lease/business";
import { leaseRate } from "@/lib/financial-lease/config";
import { getPublicVehicleById } from "@/lib/repositories/public-vehicle-repository";
import { createServerDocument, productionDataEnabled } from "@/lib/repositories/server-collection";
import { scoreLead, responseDeadline } from "@/lib/sales-engine";
import { consumePublicLeadQuota } from "@/lib/security/public-rate-limit";
import { sendLeadNotification } from "@/lib/communications/lead-notification";

const leadSchema = z.object({
  type: z.enum(["general", "financial_lease"]).optional(),
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

  let quota;
  try {
    quota = await consumePublicLeadQuota(request);
  } catch {
    return Response.json({ ok: false, error: "Aanvragen zijn tijdelijk niet beschikbaar. Probeer later opnieuw." }, { status: 503 });
  }
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
  let leaseFields = {};
  if (leadInput.type === "financial_lease") {
    const lease = financialLeaseFields.safeParse(payload);
    if (!lease.success) {
      return Response.json({ ok: false, error: "Controleer uw bedrijfs- en leasegegevens.", errors: lease.error.flatten() }, { status: 400 });
    }
    try {
      const vehicle = await getPublicVehicleById(lease.data.vehicleId);
      if (!vehicle || !eligibleForLease(vehicle)) {
        return Response.json({ ok: false, error: "Deze auto is niet meer beschikbaar voor een leaseaanvraag." }, { status: 409 });
      }
      if (vehicle.priceCents !== lease.data.expectedPriceCents) {
        return Response.json({ ok: false, error: "De verkoopprijs is gewijzigd. Vernieuw de pagina en controleer uw berekening." }, { status: 409 });
      }
      const rate = leaseRate();
      if (rate !== lease.data.expectedAnnualRateBps) {
        return Response.json({ ok: false, error: "De indicatieve rente is gewijzigd. Vernieuw de pagina en controleer uw berekening." }, { status: 409 });
      }
      let quote;
      try {
        quote = calculateLease(vehicle.priceCents, lease.data.leaseSelection, rate);
      } catch {
        return Response.json({ ok: false, error: "Controleer aanbetaling en slottermijn bij de actuele verkoopprijs." }, { status: 400 });
      }
      leaseFields = {
        companyName: lease.data.companyName,
        kvk: lease.data.kvk,
        name: lease.data.name,
        phone: lease.data.phone,
        email: lease.data.email,
        financingNeeded: true,
        channel: "website",
        financialLease: {
          selection: lease.data.leaseSelection,
          priceCents: vehicle.priceCents,
          quote,
          vehicleLabel: `${vehicle.brand} ${vehicle.model} ${vehicle.trim}`.trim(),
          requestedAt: new Date().toISOString(),
          providerStatus: "not_submitted",
        },
      };
    } catch {
      return Response.json({ ok: false, error: "Voertuiggegevens zijn tijdelijk niet beschikbaar. Probeer later opnieuw." }, { status: 503 });
    }
  }
  const id = `LEAD-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const sales = scoreLead({ ...leadInput, ...leaseFields });
  let lead;
  try {
    lead = await createServerDocument("leads", id, {
      ...leadInput,
      ...leaseFields,
      status: "new",
      sales: { ...sales, responseDueAt: responseDeadline(sales.score) },
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return Response.json({ ok: false, error: "Uw aanvraag kon niet worden opgeslagen. Probeer later opnieuw." }, { status: 503 });
  }

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

  return Response.json(leadInput.type === "financial_lease"
    ? { ok: true, mode: "firebase", id: lead.id }
    : { ok: true, mode: "firebase", lead }, { status: 201 });
}
