import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";
import { checkSocialVideoAvailability } from "@/lib/social-video/providers";
import { getSocialVideo, updateSocialVideo } from "@/lib/social-video/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(request, "socialVideos.write");
  if (auth.response) return auth.response;
  const { id } = await context.params;

  try {
    const current = await getSocialVideo(id);
    if (!current) return NextResponse.json({ error: "Video niet gevonden." }, { status: 404 });

    const availability = await checkSocialVideoAvailability(current);
    let status = current.status;
    if (availability.state === "unavailable") status = "unavailable";
    if (availability.state === "available" && current.status === "unavailable") status = "review";

    const video = await updateSocialVideo(id, {
      sourceState: availability.state,
      sourceCheckedAt: availability.checkedAt,
      status,
    });

    await writeAuditEvent({
      action: "socialVideo.availabilityChecked",
      entityType: "socialVideo",
      entityId: id,
      actor: auth.actor,
      metadata: {
        platform: current.platform,
        fromStatus: current.status,
        toStatus: video.status,
        sourceState: availability.state,
        httpStatus: availability.httpStatus,
      },
      request,
    });

    return NextResponse.json({ video, availability });
  } catch {
    return NextResponse.json({ error: "Broncontrole kon niet worden uitgevoerd." }, { status: 503 });
  }
}
