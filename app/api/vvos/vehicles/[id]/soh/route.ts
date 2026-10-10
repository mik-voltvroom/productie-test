import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authorizeApi } from "@/lib/auth/api";
import { isTrustedRequestOrigin } from "@/lib/auth/request-origin";
import { SohError } from "@/lib/soh/business";
import { sohSaveSchema } from "@/lib/soh/certificate";
import { getVehicleSohReport, saveVehicleSohReport } from "@/lib/repositories/soh-repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
async function handle(request: Request, context: Context, write: boolean) {
  const auth = await authorizeApi(request, write ? "vehicles.soh.write" : "vehicles.read");
  if (auth.response) return auth.response;
  if (!auth.actor) return json({ ok: false }, 401);
  if (write && !isTrustedRequestOrigin(request)) return json({ ok: false, error: "Ongeldige herkomst." }, 403);
  const { id } = await context.params;
  if (!/^[\w-]{1,120}$/.test(id)) return json({ ok: false, error: "Ongeldig voertuig." }, 400);
  try {
    if (!write) return json({ ok: true, ...await getVehicleSohReport(id) });
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 4000) return json({ ok: false, error: "Aanvraag te groot." }, 413);
    const input = sohSaveSchema.parse(JSON.parse(body));
    return json({ ok: true, ...await saveVehicleSohReport(id, input, auth.actor) });
  } catch (error) {
    if (error instanceof SohError) return json({ ok: false, error: error.message }, error.status);
    if (error instanceof SyntaxError || error instanceof ZodError) return json({ ok: false, error: "Controleer SOH (0–100%), meetmethode, meetdatum en voertuiggegevens." }, 400);
    console.error("SOH request failed", error instanceof Error ? error.name : "unknown");
    return json({ ok: false, error: "SOH-rapport kon niet worden verwerkt. Probeer opnieuw." }, 500);
  }
}
export const GET = (request: Request, context: Context) => handle(request, context, false);
export const POST = (request: Request, context: Context) => handle(request, context, true);
