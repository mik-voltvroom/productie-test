import { ZodError } from "zod";
import { authorizeApi } from "@/lib/auth/api";
import { carCheckCommandSchema, CarCheckError } from "@/lib/carcheck/business";
import { readCarCheck, saveCarCheck } from "@/lib/repositories/carcheck-repository";
import { vehicleIdSchema } from "@/lib/contact/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "private, no-store" } });
async function handle(request: Request, context: Context) {
  const write = request.method === "POST";
  const auth = await authorizeApi(request, write ? "vehicles.soh.write" : "vehicles.read");
  if (auth.response) return auth.response;
  if (!auth.actor) return json({ ok: false }, 401);
  try {
    const id = vehicleIdSchema.parse((await context.params).id);
    if (!write) return json({ ok: true, ...await readCarCheck(id) });
    const body = await request.text();
    if (Buffer.byteLength(body) > 64000) return json({ ok: false, error: "Aanvraag te groot." }, 413);
    const command = carCheckCommandSchema.parse(JSON.parse(body));
    return json({ ok: true, ...await saveCarCheck(id, command, auth.actor) });
  } catch (error) {
    if (error instanceof CarCheckError) return json({ ok: false, error: error.message }, error.status);
    if (error instanceof ZodError || error instanceof SyntaxError) return json({ ok: false, error: "Controleer de inspectiegegevens." }, 400);
    return json({ ok: false, error: "CarCheck-opslag is niet beschikbaar." }, 503);
  }
}
export const GET = handle;
export const POST = handle;
