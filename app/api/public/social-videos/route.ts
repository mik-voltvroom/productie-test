import { NextResponse } from "next/server";
import { listPublishedSocialVideos } from "@/lib/social-video/repository";

const placements = new Set(["homepage", "inventory", "vehicleDetail", "carCheck", "knowledge"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placement = url.searchParams.get("placement") || undefined;
  const vehicleId = url.searchParams.get("vehicleId") || undefined;
  const requestedLimit = Number(url.searchParams.get("limit") || "24");
  if (placement && !placements.has(placement)) return NextResponse.json({ error: "Ongeldige plaatsing." }, { status: 400 });

  try {
    const videos = await listPublishedSocialVideos({
      placement: placement as "homepage" | "inventory" | "vehicleDetail" | "carCheck" | "knowledge" | undefined,
      vehicleId,
      limit: Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 50)) : 24,
    });
    return NextResponse.json({ videos }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ videos: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
