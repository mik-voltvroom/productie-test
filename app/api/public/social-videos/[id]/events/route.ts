import { NextResponse } from "next/server";
import { z } from "zod";
import { incrementSocialVideoMetric } from "@/lib/social-video/repository";

const eventSchema = z.object({ event: z.enum(["video_impression", "video_play", "video_vehicle_click", "video_carcheck_click", "video_testdrive_click", "video_contact_click"]) }).strict();

const metricByEvent = {
  video_impression: "impressions",
  video_play: "playClicks",
  video_vehicle_click: "vehicleClicks",
  video_carcheck_click: "carCheckClicks",
  video_testdrive_click: "testDriveClicks",
  video_contact_click: "contactClicks",
} as const;

function sameSiteRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameSiteRequest(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const body = eventSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { id } = await context.params;
  if (!/^VIDEO-[A-Za-z0-9-]+$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const recorded = await incrementSocialVideoMetric(id, metricByEvent[body.data.event]);
    return recorded ? NextResponse.json({ ok: true }, { status: 202 }) : NextResponse.json({ ok: false }, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
