import { contactLeadMessage, contactVehicle, leadSubmissionSchema } from "@/lib/contact/business";
import { financialLeaseFields } from "@/lib/financial-lease/validation";
import { calculateLease, eligibleForLease } from "@/lib/financial-lease/business";
import { leaseRate } from "@/lib/financial-lease/config";
import { getPublicVehicleById } from "@/lib/repositories/public-vehicle-repository";
import { createServerDocument, productionDataEnabled, updateServerDocument } from "@/lib/repositories/server-collection";
import { scoreLead, responseDeadline } from "@/lib/sales-engine";
import { consumePublicLeadQuota } from "@/lib/security/public-rate-limit";
import { notificationOutcome } from "@/lib/communications/business";
import { sendLeadNotification } from "@/lib/communications/lead-notification";
import { createLeadOnce, replayedLead, SubmissionConflict } from "@/lib/repositories/lead-submission";

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
  const parsed = leadSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[issue.path.join(".")] ??= []).push(issue.message);
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message || "Controleer de ingevulde gegevens.", errors: { fieldErrors } }, { status: 400 });
  }

  const { website: _honeypot, ...leadInput } = parsed.data;
  const submissionKey = request.headers.get("idempotency-key");
  if (submissionKey && !/^[0-9a-f-]{36}$/i.test(submissionKey)) {
    return Response.json({ ok: false, error: "Ongeldige aanvraagcode." }, { status: 400 });
  }
  if (submissionKey) {
    try {
      const replay = await replayedLead(submissionKey, payload);
      if (replay) return Response.json({ ok: true, mode: "firebase", id: replay, replayed: true });
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof SubmissionConflict ? error.message : "Aanvraagopslag tijdelijk niet beschikbaar." }, { status: error instanceof SubmissionConflict ? 409 : 503 });
    }
  }
  let vehicleTitle: string | undefined;
  if (leadInput.type !== "financial_lease" && leadInput.vehicleId) {
    try {
      // Revalidate the public ID at submit time, including inventory beyond the dropdown page.
      const vehicle = await getPublicVehicleById(leadInput.vehicleId);
      if (!vehicle) {
        const error = "Deze auto is niet meer beschikbaar. Kies een andere auto of stuur een algemene vraag zonder voorkeursauto.";
        return Response.json({ ok: false, error, errors: { fieldErrors: { vehicleId: [error] } } }, { status: 400 });
      }
      vehicleTitle = contactVehicle(vehicle).label;
    } catch {
      return Response.json({ ok: false, error: "Voertuiggegevens zijn tijdelijk niet beschikbaar. Probeer later opnieuw." }, { status: 503 });
    }
  }
  const message = leadInput.type === "financial_lease" ? leadInput.message : contactLeadMessage(leadInput, vehicleTitle);
  const contactFields = { ...(vehicleTitle ? { vehicleTitle } : {}), ...(message !== undefined ? { message } : {}) };
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
  const sales = scoreLead({ ...leadInput, ...contactFields, ...leaseFields });
  let lead;
  try {
    const record = {
      ...Object.fromEntries(Object.entries({ ...leadInput, ...contactFields, ...leaseFields }).filter(([, value]) => value !== undefined)),
      notification: { status: "pending", updatedAt: now },
      status: "new",
      sales: { ...sales, responseDueAt: responseDeadline(sales.score) },
      createdAt: now,
      updatedAt: now,
    };
    if (submissionKey) {
      const result = await createLeadOnce(submissionKey, payload, id, record);
      if (!result.created) return Response.json({ ok: true, mode: "firebase", id: result.id, replayed: true }, { status: 200 });
      lead = { ...record, id };
    } else {
      lead = await createServerDocument("leads", id, record);
    }
  } catch (error) {
    if (error instanceof SubmissionConflict) return Response.json({ ok: false, error: error.message }, { status: 409 });
    return Response.json({ ok: false, error: "Uw aanvraag kon niet worden opgeslagen. Probeer later opnieuw." }, { status: 503 });
  }

  const notification = await sendLeadNotification({
    id,
    kind: "lead",
    name: leadInput.name,
    email: leadInput.email,
    phone: leadInput.phone,
    channel: leadInput.channel,
    message,
    createdAt: now,
  }).catch(() => ({ configured: true, sent: 0, failed: 1 }));
  const outcome = notificationOutcome(notification);
  try {
    await updateServerDocument("leads", id, { notification: { status: outcome, updatedAt: new Date().toISOString() } });
  } catch {
    // The durable pending marker remains visible; never turn a saved lead into a retry.
    console.error("Lead notification status persistence failed", { operation: "recordLeadNotification" });
  }
  if (outcome !== "sent") {
    console.error("Lead notification incomplete", {
      operation: "sendLeadNotification",
      reason: notification.configured ? "provider_failure" : "not_configured",
      failed: notification.failed,
    });
  }

  const { notification: _internalNotification, ...publicLead } = lead;
  return Response.json(leadInput.type === "financial_lease"
    ? { ok: true, mode: "firebase", id: lead.id }
    : { ok: true, mode: "firebase", lead: publicLead }, { status: 201 });
}
