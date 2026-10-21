import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";
import { socialVideoCreateSchema, type SocialVideo } from "@/lib/social-video/model";
import { resolveSocialVideoUrl, socialVideoDocumentId } from "@/lib/social-video/providers";
import { createSocialVideo, DuplicateSocialVideoError, listSocialVideos } from "@/lib/social-video/repository";

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "socialVideos.read");
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ videos: await listSocialVideos() });
  } catch {
    return NextResponse.json({ error: "Video-opslag is niet beschikbaar." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi(request, "socialVideos.write");
  if (auth.response) return auth.response;
  const parsed = socialVideoCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige video-invoer.", issues: parsed.error.flatten() }, { status: 400 });

  let resolved;
  try {
    resolved = await resolveSocialVideoUrl(parsed.data.sourceUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Video-URL kon niet worden verwerkt." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = socialVideoDocumentId(resolved);
  const video: SocialVideo = {
    id,
    platform: resolved.platform,
    sourceUrl: resolved.canonicalUrl,
    externalId: resolved.externalId,
    title: parsed.data.title || resolved.suggestedTitle,
    thumbnailUrl: resolved.thumbnailUrl,
    embedUrl: resolved.embedUrl,
    status: "review",
    sourceState: "unchecked",
    contentType: parsed.data.contentType,
    vehicleIds: parsed.data.vehicleIds,
    carCheckId: parsed.data.carCheckId,
    vvVerifiedId: parsed.data.vvVerifiedId,
    brand: parsed.data.brand,
    model: parsed.data.model,
    tags: parsed.data.tags,
    featured: parsed.data.featured,
    placements: parsed.data.placements,
    aspectRatio: resolved.aspectRatio,
    analytics: { impressions: 0, playClicks: 0, vehicleClicks: 0, carCheckClicks: 0, testDriveClicks: 0, contactClicks: 0 },
    createdAt: now,
    updatedAt: now,
  };

  try {
    const saved = await createSocialVideo(video);
    await writeAuditEvent({ action: "socialVideo.created", entityType: "socialVideo", entityId: id, actor: auth.actor, metadata: { platform: saved.platform, status: saved.status, vehicleIds: saved.vehicleIds }, request });
    return NextResponse.json({ video: saved }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateSocialVideoError) {
      return NextResponse.json({ error: error.message, videoId: id }, { status: 409 });
    }
    return NextResponse.json({ error: "Video kon niet persistent worden opgeslagen." }, { status: 503 });
  }
}
