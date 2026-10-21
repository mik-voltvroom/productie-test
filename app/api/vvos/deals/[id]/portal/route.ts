import { authorizeApi } from "@/lib/auth/api";
import { vehicleIdSchema } from "@/lib/contact/business";
import { rotatePortalAccess } from "@/lib/repositories/portal-repository";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "deals.changeStatus");
  if (auth.response) return auth.response;
  if (!auth.actor) return Response.json({ ok: false }, { status: 401 });
  const id = vehicleIdSchema.safeParse((await context.params).id);
  const input = await request.json().catch(() => null);
  if (!id.success || !["rotate", "revoke"].includes(input?.action)) return Response.json({ ok: false }, { status: 400 });
  try {
    const result = await rotatePortalAccess(id.data, auth.actor, input.action === "revoke");
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "private, no-store" } });
  } catch { return Response.json({ ok: false, error: "Portaal niet beschikbaar. Controleer activering, opslag en verkoopdossier." }, { status: 503 }); }
}
