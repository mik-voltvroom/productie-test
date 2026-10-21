import { randomUUID, createHash } from "node:crypto";
import { authorizeApi } from "@/lib/auth/api";
import { adminStorage } from "@/lib/firebase-admin";
import { requireServerDatabase } from "@/lib/repositories/server-collection";
import { vehicleIdSchema } from "@/lib/contact/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "private, no-store" } });
export async function POST(request: Request, context: Context) {
  const auth = await authorizeApi(request, "vehicles.soh.write");
  if (auth.response) return auth.response;
  if (!auth.actor) return json({ ok: false }, 401);
  const id = vehicleIdSchema.safeParse((await context.params).id);
  if (!id.success) return json({ ok: false }, 400);
  const type = request.headers.get("content-type");
  if (!["image/jpeg", "image/png", "application/pdf"].includes(type || "")) return json({ ok: false, error: "Gebruik JPEG, PNG of PDF." }, 415);
  if (!adminStorage || !request.body) return json({ ok: false, error: "Bewijsopslag niet beschikbaar." }, 503);
  try {
    const db = requireServerDatabase();
    if (!(await db.collection("vehicles").doc(id.data).get()).exists) return json({ ok: false }, 404);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10 * 1024 * 1024) { await reader.cancel(); return json({ ok: false, error: "Maximaal 10 MB per bestand." }, 413); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const valid = type === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
      : type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid) return json({ ok: false, error: "Bestandsinhoud komt niet overeen met het type." }, 400);
    const evidenceId = randomUUID();
    const path = `carcheck/${id.data}/${evidenceId}`;
    await adminStorage.bucket().file(path).save(bytes, { resumable: false, contentType: type!, preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { cacheControl: "private, no-store" } });
    await db.collection("carCheckEvidence").doc(evidenceId).create({ vehicleId: id.data, path, contentType: type,
      sha256: createHash("sha256").update(bytes).digest("hex"), size, createdBy: auth.actor.uid, createdAt: new Date().toISOString() });
    return json({ ok: true, id: evidenceId }, 201);
  } catch { return json({ ok: false, error: "Bewijs niet geregistreerd. Probeer opnieuw." }, 503); }
}
export async function GET(request: Request, context: Context) {
  const auth = await authorizeApi(request, "vehicles.read");
  if (auth.response) return auth.response;
  const vehicle = vehicleIdSchema.safeParse((await context.params).id);
  const evidenceId = new URL(request.url).searchParams.get("evidenceId") || "";
  if (!vehicle.success || !/^[0-9a-f-]{36}$/i.test(evidenceId)) return json({ ok: false }, 400);
  try {
    const doc = await requireServerDatabase().collection("carCheckEvidence").doc(evidenceId).get();
    const data = doc.data();
    if (!data || data.vehicleId !== vehicle.data) return json({ ok: false }, 404);
    if (!adminStorage) return json({ ok: false }, 503);
    const [bytes] = await adminStorage.bucket().file(data.path).download();
    return new Response(new Uint8Array(bytes), { headers: { "content-type": data.contentType, "content-disposition": `attachment; filename="carcheck-${evidenceId}"`,
      "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow" } });
  } catch { return json({ ok: false, error: "Bewijs niet beschikbaar." }, 503); }
}
