import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkSocialVideoAvailability, resolveSocialVideoUrl, socialVideoDocumentId } from "@/lib/social-video/providers";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const fakeFetch = (status: number) => (async () => new Response(null, { status })) as typeof fetch;
const metadataFetch = (async () => new Response(JSON.stringify({ title: "Praktijkvideo", thumbnail_url: "https://cdn.example.test/thumb.jpg" }), {
  status: 200,
  headers: { "Content-Type": "application/json" },
})) as typeof fetch;
const metadataUnavailable = (async () => new Response(null, { status: 503 })) as typeof fetch;
const unsafeMetadataFetch = (async () => new Response(JSON.stringify({ title: `  ${"Lange caption ".repeat(30)}  `, thumbnail_url: "http://insecure.example.test/thumb.jpg" }), {
  status: 200,
  headers: { "Content-Type": "application/json" },
})) as typeof fetch;

describe("VV Stories / Social Video Engine", () => {
  it("herkent YouTube watch, shorts en youtu.be URL's en verrijkt metadata", async () => {
    const watch = await resolveSocialVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", metadataFetch);
    const short = await resolveSocialVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ", metadataFetch);
    const compact = await resolveSocialVideoUrl("https://youtu.be/dQw4w9WgXcQ", metadataFetch);
    expect(watch.platform).toBe("youtube");
    expect(watch.aspectRatio).toBe("16:9");
    expect(short.aspectRatio).toBe("9:16");
    expect(compact.externalId).toBe("dQw4w9WgXcQ");
    expect(watch.embedUrl).toContain("youtube-nocookie.com");
    expect(watch.suggestedTitle).toBe("Praktijkvideo");
    expect(watch.thumbnailUrl).toBe("https://cdn.example.test/thumb.jpg");
    expect(socialVideoDocumentId(watch)).toBe(socialVideoDocumentId(compact));
  });

  it("herkent volledige TikTok-video URL's zonder accountkoppeling en gebruikt publieke metadata", async () => {
    const video = await resolveSocialVideoUrl("https://www.tiktok.com/@voltvroom/video/7512345678901234567?is_from_webapp=1", metadataFetch);
    expect(video.platform).toBe("tiktok");
    expect(video.externalId).toBe("7512345678901234567");
    expect(video.aspectRatio).toBe("9:16");
    expect(video.canonicalUrl).not.toContain("is_from_webapp");
    expect(video.suggestedTitle).toBe("Praktijkvideo");
    expect(video.thumbnailUrl).toBe("https://cdn.example.test/thumb.jpg");
  });

  it("blijft importeren wanneer publieke metadata tijdelijk niet beschikbaar is", async () => {
    const youtube = await resolveSocialVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", metadataUnavailable);
    const tiktok = await resolveSocialVideoUrl("https://www.tiktok.com/@voltvroom/video/7512345678901234567", metadataUnavailable);
    expect(youtube.suggestedTitle).toBe("YouTube-video");
    expect(youtube.thumbnailUrl).toContain("i.ytimg.com");
    expect(tiktok.suggestedTitle).toBe("TikTok-video");
    expect(tiktok.thumbnailUrl).toBeUndefined();
  });

  it("normaliseert lange titels en weigert onveilige thumbnails", async () => {
    const video = await resolveSocialVideoUrl("https://www.tiktok.com/@voltvroom/video/7512345678901234567", unsafeMetadataFetch);
    expect(video.suggestedTitle.length).toBe(180);
    expect(video.suggestedTitle).not.toContain("  ");
    expect(video.thumbnailUrl).toBeUndefined();
  });

  it("weigert onbekende, lookalike en onveilige platform-URL's", async () => {
    await expect(resolveSocialVideoUrl("https://example.com/video/123", metadataUnavailable)).rejects.toThrow("niet ondersteund");
    await expect(resolveSocialVideoUrl("https://notyoutube.com/watch?v=dQw4w9WgXcQ", metadataUnavailable)).rejects.toThrow("niet ondersteund");
    await expect(resolveSocialVideoUrl("https://nottiktok.com/@voltvroom/video/7512345678901234567", metadataUnavailable)).rejects.toThrow("niet ondersteund");
    await expect(resolveSocialVideoUrl("https://notinstagram.com/reel/ABC123/", metadataUnavailable)).rejects.toThrow("niet ondersteund");
    await expect(resolveSocialVideoUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ", metadataUnavailable)).rejects.toThrow("HTTPS");
  });

  it("classificeert bronbeschikbaarheid conservatief", async () => {
    const video = { platform: "youtube" as const, sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };
    await expect(checkSocialVideoAvailability(video, fakeFetch(200))).resolves.toMatchObject({ state: "available", httpStatus: 200 });
    await expect(checkSocialVideoAvailability(video, fakeFetch(404))).resolves.toMatchObject({ state: "unavailable", httpStatus: 404 });
    await expect(checkSocialVideoAvailability(video, fakeFetch(429))).resolves.toMatchObject({ state: "unknown", httpStatus: 429 });
  });

  it("blokkeert dubbele imports via een deterministisch document-id en atomische create", () => {
    const route = read("app/api/social-videos/route.ts");
    const repository = read("lib/social-video/repository.ts");
    expect(route).toContain("socialVideoDocumentId(resolved)");
    expect(route).toContain("DuplicateSocialVideoError");
    expect(route).toContain("status: 409");
    expect(repository).toContain(".create(safe)");
  });

  it("blokkeert publicatie wanneer de bron bekend onbeschikbaar is", () => {
    const route = read("app/api/social-videos/[id]/route.ts");
    expect(route).toContain('parsed.data.status === "published" && before.sourceState === "unavailable"');
    expect(route).toContain("Deze video kan niet worden gepubliceerd omdat de bron niet beschikbaar is");
  });

  it("heeft Firestore-indexen voor placement- en voertuigqueries", () => {
    const config = JSON.parse(read("firestore.indexes.json")) as { indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string; order?: string; arrayConfig?: string }> }> };
    const videoIndexes = config.indexes.filter(index => index.collectionGroup === "socialVideos");
    expect(videoIndexes.length).toBeGreaterThanOrEqual(6);
    expect(videoIndexes.some(index => index.fields.some(field => field.fieldPath === "placements.vehicleDetail") && index.fields.some(field => field.fieldPath === "vehicleIds" && field.arrayConfig === "CONTAINS"))).toBe(true);
    expect(videoIndexes.some(index => index.fields.some(field => field.fieldPath === "placements.carCheck"))).toBe(true);
  });

  it("ververst dynamische video-plaatsingen zonder nieuwe release", () => {
    expect(read("app/page.tsx")).toMatch(/export const (?:revalidate = 60|dynamic = "force-dynamic")/);
    expect(read("app/vv-verified/page.tsx")).toContain("export const revalidate = 60");
    expect(read("app/voorraad/[slug]/page.tsx")).toContain('export const dynamic = "force-dynamic"');
    expect(read("app/uit-de-praktijk/page.tsx")).toContain('export const dynamic = "force-dynamic"');
  });

  it("publiceert alleen allow-listed SocialVideo velden", () => {
    const model = read("lib/social-video/model.ts");
    expect(model).toContain("publicSocialVideoSchema");
    expect(model).not.toContain("vin:");
    expect(model).not.toContain("purchasePrice");
    expect(model).not.toContain("margin");
    expect(model).not.toContain("customer");
  });

  it("laadt externe spelers alleen na expliciete interactie", () => {
    const component = read("components/SocialVideo.tsx");
    expect(component).toContain("active && video.embedUrl");
    expect(component).toContain("onClick={activate}");
    expect(component).toContain("video_play");
    expect(component).toContain("video_impression");
  });

  it("heeft een beveiligde VVOS-inbox, broncontrole en publieke videohub", () => {
    expect(read("app/api/social-videos/route.ts")).toContain('authorizeApi(request, "socialVideos.write")');
    expect(read("app/api/social-videos/[id]/route.ts")).toContain('authorizeApi(request, "socialVideos.write")');
    const availability = read("app/api/social-videos/[id]/availability/route.ts");
    expect(availability).toContain('authorizeApi(request, "socialVideos.write")');
    expect(availability).toContain('status = "unavailable"');
    expect(read("app/uit-de-praktijk/page.tsx")).toContain("SocialVideoHub");
    expect(read("components/dashboard/DashboardNav.tsx")).toContain("/dashboard/social-video");
  });

  it("houdt accountkoppelingen en credentials buiten versie 1", () => {
    const providers = read("lib/social-video/providers.ts");
    expect(providers).not.toContain("clientSecret");
    expect(providers).not.toContain("accessToken");
    expect(providers).not.toContain("oauth");
  });
});
