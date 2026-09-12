import { describe, expect, it } from "vitest";
import { fetchInstagramFeed, fetchYouTubeFeed } from "@/lib/social-feed/providers";

describe("automatische Volt & Vroom social-feed", () => {
  it("haalt Instagram-media server-side op zonder token in de URL", async () => {
    let requestUrl = "";
    let authorization = "";
    const fetcher = (async (input, init) => {
      requestUrl = String(input);
      authorization = new Headers(init?.headers).get("Authorization") || "";
      return new Response(JSON.stringify({ data: [{ id: "IG-1", caption: "Nieuwe binnenkomer. Bekijk hem nu.", media_type: "VIDEO", permalink: "https://www.instagram.com/reel/ABC123/", thumbnail_url: "https://scontent.cdninstagram.com/thumb.jpg", timestamp: "2026-09-12T10:00:00+0000" }] }), { status: 200 });
    }) as typeof fetch;
    const items = await fetchInstagramFeed("private-token", fetcher);
    expect(requestUrl).not.toContain("private-token");
    expect(authorization).toBe("Bearer private-token");
    expect(items[0]).toMatchObject({ platform: "instagram", title: "Nieuwe binnenkomer.", isVideo: true });
  });

  it("weigert door Meta aangeleverde URLs buiten de allowlist", async () => {
    const fetcher = (async () => new Response(JSON.stringify({ data: [{ id: "IG-2", media_type: "IMAGE", permalink: "https://phishing.example/post", media_url: "https://phishing.example/image.jpg", timestamp: "2026-09-12T10:00:00Z" }] }), { status: 200 })) as typeof fetch;
    await expect(fetchInstagramFeed("private-token", fetcher)).resolves.toEqual([]);
  });

  it("leest het officiële YouTube-kanaalfeedformaat", async () => {
    const xml = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/"><entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>Praktijkvideo</title><published>2026-09-11T10:00:00Z</published><media:group><media:description>Een eerlijke uitleg.</media:description><media:thumbnail url="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" /></media:group></entry></feed>`;
    const fetcher = (async () => new Response(xml, { status: 200 })) as typeof fetch;
    const items = await fetchYouTubeFeed("UCLfb6AjYG8bfWNe8wLytV7w", fetcher);
    expect(items[0]).toMatchObject({ platform: "youtube", title: "Praktijkvideo", isVideo: true });
    expect(items[0]?.sourceUrl).toContain("dQw4w9WgXcQ");
  });

  it("doet geen externe aanvraag bij ontbrekende configuratie", async () => {
    const failFetch = (async () => { throw new Error("mag niet worden aangeroepen"); }) as typeof fetch;
    await expect(fetchInstagramFeed("", failFetch)).resolves.toEqual([]);
    await expect(fetchYouTubeFeed("ongeldig", failFetch)).resolves.toEqual([]);
  });
});
