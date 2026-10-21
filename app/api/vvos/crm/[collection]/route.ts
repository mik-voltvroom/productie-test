import { authorizeApi } from "@/lib/auth/api";
import { crmSchemas, CrmError, leadUpdateSchema, type CrmCollection } from "@/lib/crm/business";
import { vehicleIdSchema } from "@/lib/contact/business";
import { readCrm, saveCrm, updateLead } from "@/lib/repositories/crm-server";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ collection: string }> };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "private, no-store" } });
async function handle(request: Request, context: Context) {
  const write = request.method !== "GET";
  const auth = await authorizeApi(request, write ? "leads.write" : "leads.read");
  if (auth.response) return auth.response;
  if (!auth.actor) return json({ ok: false }, 401);
  const { collection } = await context.params;
  if (collection !== "leads" && !Object.hasOwn(crmSchemas, collection)) return json({ ok: false }, 404);
  try {
    if (!write) {
      const leadId = collection === "leads" ? undefined : vehicleIdSchema.parse(new URL(request.url).searchParams.get("leadId"));
      return json({ ok: true, items: await readCrm(collection as "leads" | CrmCollection, leadId) });
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 64000) return json({ ok: false, error: "Aanvraag te groot." }, 413);
    const input = JSON.parse(raw);
    if (collection === "leads") {
      const id = vehicleIdSchema.parse(input?.id);
      await updateLead(id, leadUpdateSchema.parse(input?.patch), auth.actor);
    } else {
      const record = crmSchemas[collection as CrmCollection].parse(input);
      await saveCrm(collection as CrmCollection, record, auth.actor);
    }
    return json({ ok: true });
  } catch (error) {
    if (error instanceof CrmError) return json({ ok: false, error: error.message }, error.status);
    if (error instanceof ZodError || error instanceof SyntaxError) return json({ ok: false, error: "Controleer de CRM-gegevens." }, 400);
    return json({ ok: false, error: "CRM-opslag is niet beschikbaar. Probeer opnieuw." }, 503);
  }
}
export const GET = handle;
export const POST = handle;
