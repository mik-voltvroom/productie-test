import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { socialVideoSchema } from "@/lib/social-video/model";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Social Video analytics", () => {
  it("initialiseert commerciële tellers veilig op nul", () => {
    const video = socialVideoSchema.parse({
      id: "VIDEO-test",
      platform: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Test",
      status: "review",
      contentType: "short",
      placements: { homepage: false, inventory: false, vehicleDetail: false, carCheck: false, knowledge: false },
      createdAt: "2026-08-17T10:00:00.000Z",
      updatedAt: "2026-08-17T10:00:00.000Z",
    });
    expect(video.analytics.playClicks).toBe(0);
    expect(video.analytics.vehicleClicks).toBe(0);
  });

  it("beperkt publieke events tot een vaste allow-list", () => {
    const route = read("app/api/public/social-videos/[id]/events/route.ts");
    expect(route).toContain("video_impression");
    expect(route).toContain("video_play");
    expect(route).toContain("video_vehicle_click");
    expect(route).toContain("sameSiteRequest");
    expect(route).not.toContain("email");
    expect(route).not.toContain("phone");
  });

  it("stuurt geen analytics-tellers mee in het publieke video-object", () => {
    const model = read("lib/social-video/model.ts");
    const publicSchema = model.slice(model.indexOf("export const publicSocialVideoSchema"));
    expect(publicSchema).not.toContain("analytics: true");
  });

  it("toont commerciële videoresultaten in VVOS", () => {
    const manager = read("components/dashboard/SocialVideoManager.tsx");
    expect(manager).toContain("website plays");
    expect(manager).toContain("doorkliks naar auto's");
    expect(manager).toContain("Top content");
  });
});
