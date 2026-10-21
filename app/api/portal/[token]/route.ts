import { readPortal } from "@/lib/repositories/portal-repository";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const headers = { "cache-control": "private, no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow" };
  try {
    const portal = await readPortal((await params).token);
    return Response.json(portal ? { ok: true, portal } : { ok: false, error: "Toegang ongeldig of verlopen." }, { status: portal ? 200 : 404, headers });
  } catch { return Response.json({ ok: false, error: "Klantportaal niet beschikbaar." }, { status: 503, headers }); }
}
