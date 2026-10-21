import { XMLParser } from "fast-xml-parser";
import type { SocialFeedItem } from "@/lib/social-feed/model";

const REQUEST_TIMEOUT_MS = 6_000;
const MAX_ITEMS_PER_SOURCE = 6;

type InstagramMedia = {
  id?: unknown;
  caption?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  permalink?: unknown;
  thumbnail_url?: unknown;
  timestamp?: unknown;
};

type InstagramResponse = { data?: unknown };

function cleanText(value: unknown, maximum: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maximum) : undefined;
}

function httpsUrl(value: unknown, allowedHosts: string[]): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    const allowed = allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
    return url.protocol === "https:" && allowed ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function isoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function instagramTitle(caption: string | undefined): string {
  if (!caption) return "Nieuw van Volt & Vroom";
  const firstSentence = caption.split(/(?<=[.!?])\s|\n/)[0]?.trim() || caption;
  return firstSentence.slice(0, 110);
}

export async function fetchInstagramFeed(
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<SocialFeedItem[]> {
  if (!accessToken.trim()) return [];
  const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const endpoint = `https://graph.instagram.com/me/media?fields=${encodeURIComponent(fields)}&limit=${MAX_ITEMS_PER_SOURCE}`;
  const response = await fetcher(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Instagram-feed niet beschikbaar (${response.status}).`);

  const payload = await response.json() as InstagramResponse;
  if (!Array.isArray(payload.data)) return [];
  return payload.data.flatMap((entry): SocialFeedItem[] => {
    const media = entry as InstagramMedia;
    const id = cleanText(media.id, 100);
    const sourceUrl = httpsUrl(media.permalink, ["instagram.com"]);
    const publishedAt = isoDate(media.timestamp);
    if (!id || !sourceUrl || !publishedAt) return [];
    const caption = cleanText(media.caption, 420);
    const mediaType = cleanText(media.media_type, 30)?.toUpperCase();
    const thumbnailUrl = httpsUrl(
      mediaType === "VIDEO" ? media.thumbnail_url : media.media_url,
      ["cdninstagram.com", "fbcdn.net"],
    );
    return [{
      id: `instagram-${id}`,
      platform: "instagram",
      title: instagramTitle(caption),
      excerpt: caption,
      sourceUrl,
      thumbnailUrl,
      publishedAt,
      isVideo: mediaType === "VIDEO",
    }];
  });
}

type YouTubeEntry = {
  "yt:videoId"?: unknown;
  title?: unknown;
  published?: unknown;
  "media:group"?: { "media:description"?: unknown; "media:thumbnail"?: { "@_url"?: unknown } };
};

function asEntries(value: unknown): YouTubeEntry[] {
  if (!value) return [];
  return Array.isArray(value) ? value as YouTubeEntry[] : [value as YouTubeEntry];
}

export async function fetchYouTubeFeed(
  channelId: string,
  fetcher: typeof fetch = fetch,
): Promise<SocialFeedItem[]> {
  if (!/^UC[A-Za-z0-9_-]{20,30}$/.test(channelId)) return [];
  const endpoint = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const response = await fetcher(endpoint, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
    headers: { "User-Agent": "VoltVroom-VVOS/1.0 social-feed" },
  });
  if (!response.ok) throw new Error(`YouTube-feed niet beschikbaar (${response.status}).`);
  const xml = await response.text();
  const parsed = new XMLParser({ ignoreAttributes: false, trimValues: true }).parse(xml) as { feed?: { entry?: unknown } };
  return asEntries(parsed.feed?.entry).slice(0, MAX_ITEMS_PER_SOURCE).flatMap((entry): SocialFeedItem[] => {
    const id = cleanText(entry["yt:videoId"], 40);
    const title = cleanText(entry.title, 140);
    const publishedAt = isoDate(entry.published);
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id) || !title || !publishedAt) return [];
    const thumbnailUrl = httpsUrl(entry["media:group"]?.["media:thumbnail"]?.["@_url"], ["ytimg.com"])
      || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    return [{
      id: `youtube-${id}`,
      platform: "youtube",
      title,
      excerpt: cleanText(entry["media:group"]?.["media:description"], 420),
      sourceUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl,
      publishedAt,
      isVideo: true,
    }];
  });
}
