import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeApi } from "@/lib/auth/api";
import { EditorialConflict, editorialCommandSchema } from "@/lib/vehicle/editorial";
import { updateVehicleEditorial } from "@/lib/repositories/vehicle-editorial-repository";

export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "vehicles.write");
  if (auth.response) return auth.response;
  if (!auth.actor) return NextResponse.json({ ok: false }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  const { id } = await context.params;
  if (!/^[\w-]{1,120}$/.test(id)) return NextResponse.json({ ok: false, error: "Ongeldig voertuig." }, { status: 400 });
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 100000) return NextResponse.json({ ok: false, error: "Aanvraag te groot." }, { status: 413 });
    const parsed = editorialCommandSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ongeldige wijziging." }, { status: 400 });
    const vehicle = await updateVehicleEditorial(id, parsed.data, auth.actor);
    revalidatePath(`/voorraad/${encodeURIComponent(vehicle.slug)}`);
    return NextResponse.json({ ok: true, vehicle }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof EditorialConflict) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ ok: false, error: "Ongeldige aanvraag." }, { status: 400 });
    console.error("Vehicle editorial update failed", id, error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: "Wijziging niet opgeslagen. Probeer opnieuw." }, { status: 500 });
  }
}
