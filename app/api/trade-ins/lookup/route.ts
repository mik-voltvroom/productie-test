import { licensePlateSchema } from "@/lib/inruil/validation";
import { lookupRdwVehicle, RdwUnavailableError } from "@/lib/inruil/rdw-service";
import { consumePublicLookupQuota } from "@/lib/security/public-rate-limit";

export async function GET(request: Request) {
  const quota = await consumePublicLookupQuota(request);
  if (!quota.allowed) {
    return Response.json(
      { ok: false, error: "Te veel kentekencontroles in korte tijd. Vul de gegevens handmatig in of probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
    );
  }

  const value = new URL(request.url).searchParams.get("kenteken") || "";
  const parsed = licensePlateSchema.safeParse(value);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message || "Ongeldig kenteken." }, { status: 400 });
  }

  try {
    const vehicle = await lookupRdwVehicle(parsed.data);
    if (!vehicle) {
      return Response.json({ ok: false, error: "Geen voertuig gevonden. Controleer het kenteken of vul de gegevens handmatig in." }, { status: 404 });
    }
    return Response.json({ ok: true, vehicle });
  } catch (error) {
    if (error instanceof RdwUnavailableError) {
      return Response.json(
        { ok: false, error: "RDW is tijdelijk niet bereikbaar. U kunt de voertuiggegevens handmatig invullen." },
        { status: 502 },
      );
    }
    return Response.json({ ok: false, error: "Kentekencontrole lukt nu niet." }, { status: 500 });
  }
}
