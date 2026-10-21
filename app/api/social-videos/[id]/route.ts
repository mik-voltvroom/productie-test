import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";
import { socialVideoContentTypeSchema, socialVideoStatusSchema, type SocialVideo } from "@/lib/social-video/model";
import { getSocialVideo, updateSocialVideo } from "@/lib/social-video/repository";

const patchSchema = z.object({
  title: z.string().min(1).max(180).optional(),
  caption: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  status: socialVideoStatusSchema.optional(),
  contentType: socialVideoContentTypeSchema.optional(),
  vehicleIds: z.array(z.string()).max(20).optional(),
  carCheckId: z.string().nullable().optional(),
  vvVerifiedId: z.string().nullable().optional(),
  brand: z.string().max(80).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  tags: z.array(z.string().max(60)).max(30).optional(),
  featured: z.boolean().optional(),
  placements: z.object({
    homepage: z.boolean(), inventory: z.boolean(), vehicleDetail: z.boolean(), carCheck: z.boolean(), knowledge: z.boolean(),
  }).optional(),
}).strict();

const transitions: Record<SocialVideo["status"], ReadonlySet<SocialVideo["status"]>> = {
  draft: new Set(["draft", "review", "archived"]),
  review: new Set(["review", "published", "archived", "unavailable"]),
  published: new Set(["published", "review", "archived", "unavailable"]),
  archived: new Set(["archived", "review"]),
  unavailable: new Set(["unavailable", "review", "archived"]),
};

const editorialFields = new Set([
  "title", "caption", "description", "contentType", "vehicleIds", "carCheckId", "vvVerifiedId",
  "brand", "model", "tags", "featured", "placements",
]);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "socialVideos.read");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    const video = await getSocialVideo(id);
    return video ? NextResponse.json({ video }) : NextResponse.json({ error: "Video niet gevonden." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Video-opslag is niet beschikbaar." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "socialVideos.write");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige wijziging.", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const before = await getSocialVideo(id);
    if (!before) return NextResponse.json({ error: "Video niet gevonden." }, { status: 404 });
    if (parsed.data.status && !transitions[before.status].has(parsed.data.status)) {
      return NextResponse.json({ error: `Statusovergang ${before.status} → ${parsed.data.status} is niet toegestaan.` }, { status: 409 });
    }
    if (parsed.data.status === "published" && before.sourceState === "unavailable") {
      return NextResponse.json({ error: "Deze video kan niet worden gepubliceerd omdat de bron niet beschikbaar is. Controleer de bron opnieuw." }, { status: 409 });
    }

    const hasEditorialMutation = Object.keys(parsed.data).some(key => editorialFields.has(key));
    if (before.status === "published" && hasEditorialMutation && parsed.data.status === "published") {
      return NextResponse.json({ error: "Wijzig eerst de reviewgegevens en publiceer de video daarna opnieuw." }, { status: 409 });
    }

    const patch: Partial<SocialVideo> = { ...parsed.data } as Partial<SocialVideo>;
    if (parsed.data.brand === null) patch.brand = undefined;
    if (parsed.data.model === null) patch.model = undefined;
    if (parsed.data.carCheckId === null) patch.carCheckId = undefined;
    if (parsed.data.vvVerifiedId === null) patch.vvVerifiedId = undefined;
    if (before.status === "published" && hasEditorialMutation && !parsed.data.status) patch.status = "review";
    if (parsed.data.status === "published" && before.status !== "published") patch.publishedAt = new Date().toISOString();

    const video = await updateSocialVideo(id, patch);
    await writeAuditEvent({
      action: "socialVideo.updated",
      entityType: "socialVideo",
      entityId: id,
      actor: auth.actor,
      metadata: {
        fromStatus: before.status,
        toStatus: video.status,
        vehicleIds: video.vehicleIds,
        contentType: video.contentType,
        placements: video.placements,
        editorialMutation: hasEditorialMutation,
      },
      request,
    });
    return NextResponse.json({ video });
  } catch {
    return NextResponse.json({ error: "Video kon niet worden bijgewerkt." }, { status: 503 });
  }
}
