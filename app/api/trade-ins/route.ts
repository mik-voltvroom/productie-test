import { scoreLead, responseDeadline } from "@/lib/sales-engine";
import {
  ALLOWED_TRADE_IN_PHOTO_TYPES,
  MAX_TRADE_IN_PHOTO_BYTES,
  MAX_TRADE_IN_PHOTOS,
  MAX_TRADE_IN_TOTAL_PHOTO_BYTES,
  tradeInSubmissionSchema,
} from "@/lib/inruil/validation";
import {
  persistTradeInRequest,
  TradeInPersistenceUnavailableError,
} from "@/lib/repositories/trade-in-repository";
import { consumePublicLeadQuota } from "@/lib/security/public-rate-limit";
import { sendLeadNotification } from "@/lib/communications/lead-notification";
import type { Lead } from "@/types";

const conditionLabels = {
  excellent: "Uitstekend",
  good: "Goed",
  used: "Gebruikt",
  damage: "Schade aanwezig",
} as const;

const maintenanceLabels = {
  complete: "Compleet",
  partial: "Gedeeltelijk",
  unknown: "Onbekend",
} as const;

const keyLabels = {
  one: "1 sleutel",
  two: "2 sleutels",
  more: "Meer dan 2 sleutels",
} as const;

export async function POST(request: Request) {
  const quota = await consumePublicLeadQuota(request);
  if (!quota.allowed) {
    return Response.json(
      { ok: false, error: "Te veel aanvragen in korte tijd. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ ok: false, error: "De aanvraag kon niet worden gelezen." }, { status: 400 });

  const parsed = tradeInSubmissionSchema.safeParse({
    licensePlate: form.get("licensePlate"),
    mileageKm: form.get("mileageKm"),
    brand: form.get("brand"),
    model: form.get("model"),
    year: form.get("year") || undefined,
    condition: form.get("condition"),
    maintenanceHistory: form.get("maintenanceHistory"),
    keys: form.get("keys"),
    options: form.get("options") || undefined,
    damage: form.get("damage") || undefined,
    desiredVehicleId: form.get("desiredVehicleId") || undefined,
    desiredVehicleLabel: form.get("desiredVehicleLabel") || undefined,
    name: form.get("name"),
    email: form.get("email") || "",
    phone: form.get("phone") || "",
    contactPreference: form.get("contactPreference"),
    consent: form.get("consent"),
    website: form.get("website") || "",
  });

  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Controleer de ingevulde gegevens." },
      { status: 400 },
    );
  }

  const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (photos.length > MAX_TRADE_IN_PHOTOS) {
    return Response.json({ ok: false, error: "Voeg maximaal zes foto’s toe." }, { status: 400 });
  }
  if (photos.some(photo => !ALLOWED_TRADE_IN_PHOTO_TYPES.has(photo.type))) {
    return Response.json({ ok: false, error: "Gebruik JPG, PNG, WebP of HEIC voor foto’s." }, { status: 400 });
  }
  if (photos.some(photo => photo.size > MAX_TRADE_IN_PHOTO_BYTES)) {
    return Response.json({ ok: false, error: "Een foto mag maximaal 4 MB groot zijn." }, { status: 400 });
  }
  if (photos.reduce((total, photo) => total + photo.size, 0) > MAX_TRADE_IN_TOTAL_PHOTO_BYTES) {
    return Response.json({ ok: false, error: "De foto’s mogen samen maximaal 20 MB groot zijn." }, { status: 400 });
  }

  const data = parsed.data;
  const now = new Date().toISOString();
  const leadId = "LEAD-" + crypto.randomUUID();
  const tradeInId = "INR-" + crypto.randomUUID();
  const message = [
    "Inruilaanvraag voor " + data.brand + " " + data.model + " (" + data.licensePlate + ").",
    "Kilometerstand: " + data.mileageKm + " km.",
    "Staat: " + conditionLabels[data.condition] + ".",
    "Onderhoud: " + maintenanceLabels[data.maintenanceHistory] + ".",
    "Sleutels: " + keyLabels[data.keys] + ".",
    data.damage ? "Schade/bijzonderheden: " + data.damage : "",
    data.options ? "Opties: " + data.options : "",
    data.desiredVehicleLabel ? "Gewenste auto: " + data.desiredVehicleLabel + "." : "",
  ].filter(Boolean).join(" ");

  const leadInput: Lead = {
    vehicleId: data.desiredVehicleId || undefined,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    channel: "website",
    message,
    consent: true,
    preferredContact: data.contactPreference,
    hasTradeIn: true,
  };
  const sales = scoreLead(leadInput);

  try {
    const result = await persistTradeInRequest({
      leadId,
      tradeInId,
      photos,
      lead: {
        ...leadInput,
        status: "new",
        sales: { ...sales, responseDueAt: responseDeadline(sales.score) },
        createdAt: now,
        updatedAt: now,
      },
      tradeIn: {
        leadId,
        licensePlate: data.licensePlate,
        mileageKm: data.mileageKm,
        brand: data.brand,
        model: data.model,
        year: data.year,
        condition: conditionLabels[data.condition],
        maintenanceHistory: data.maintenanceHistory,
        keys: data.keys,
        damage: data.damage,
        options: data.options,
        desiredVehicleId: data.desiredVehicleId,
        status: "requested",
        createdAt: now,
        updatedAt: now,
      },
    });

    const notification = await sendLeadNotification({
      id: leadId,
      kind: "trade-in",
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      channel: "website",
      message,
      createdAt: now,
    }).catch(() => ({ configured: true, sent: 0, failed: 1 }));
    if (!notification.configured || notification.failed > 0) {
      console.error("Lead notification incomplete", {
        operation: "sendLeadNotification",
        reason: notification.configured ? "provider_failure" : "not_configured",
        failed: notification.failed,
      });
    }

    return Response.json(
      { ok: true, tradeInId, uploadedPhotos: result.photoPaths.length },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TradeInPersistenceUnavailableError) {
      return Response.json({ ok: false, error: "Inruilaanvragen opslaan is tijdelijk niet beschikbaar." }, { status: 503 });
    }
    const errorCode = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code.slice(0, 80)
      : undefined;
    console.error("Trade-in persistence failed", {
      operation: "persistTradeInRequest",
      errorName: error instanceof Error ? error.name : "UnknownError",
      ...(errorCode ? { errorCode } : {}),
    });
    return Response.json(
      { ok: false, error: "De aanvraag kon niet veilig worden opgeslagen. Probeer het opnieuw of bel 0646585468." },
      { status: 500 },
    );
  }
}
