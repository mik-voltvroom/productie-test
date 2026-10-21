import { createHash } from "node:crypto";
import type { SocialVideo, SocialVideoPlatform, SocialVideoSourceState } from "@/lib/social-video/model";

export type ResolvedSocialVideo = {
  platform: SocialVideoPlatform;
  externalId?: string;
  canonicalUrl: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  aspectRatio: "9:16" | "16:9";
  suggestedTitle: string;
};

export type SocialVideoAvailability = {
  state: Exclude<SocialVideoSourceState, "unchecked">;
  checkedAt: string;
  httpStatus?: number;
};

type OEmbedMetadata = {
  title?: string;
  thumbnail_url?: string;
};

export interface SocialVideoProvider {
  platform: SocialVideoPlatform;
  canHandle(url: URL): boolean;
  resolve(url: URL, fetcher: typeof fetch): Promise<ResolvedSocialVideo>;
}

function isHost(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function safeTitle(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 180) : fallback;
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function publicMetadata(endpoint: string, fetcher: typeof fetch): Promise<OEmbedMetadata | null> {
  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(3500),
      headers: { "User-Agent": "VoltVroom-VVOS/1.0 metadata-import" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json() as OEmbedMetadata;
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (isHost(url.hostname, "youtube.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed"].includes(parts[0] ?? "")) return parts[1] ?? null;
  }
  return null;
}

const youtubeProvider: SocialVideoProvider = {
  platform: "youtube",
  canHandle(url) {
    return Boolean(youtubeId(url));
  },
  async resolve(url, fetcher) {
    const id = youtubeId(url);
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) throw new Error("Ongeldige YouTube-video-URL.");
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    const metadata = await publicMetadata(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl)}`, fetcher);
    const isShort = url.pathname.includes("/shorts/");
    return {
      platform: "youtube",
      externalId: id,
      canonicalUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      thumbnailUrl: safeHttpsUrl(metadata?.thumbnail_url) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      aspectRatio: isShort ? "9:16" : "16:9",
      suggestedTitle: safeTitle(metadata?.title, "YouTube-video"),
    };
  },
};

function tiktokId(url: URL): string | null {
  if (!isHost(url.hostname, "tiktok.com")) return null;
  const match = url.pathname.match(/\/video\/(\d+)/);
  return match?.[1] ?? null;
}

const tiktokProvider: SocialVideoProvider = {
  platform: "tiktok",
  canHandle(url) {
    return Boolean(tiktokId(url));
  },
  async resolve(url, fetcher) {
    const id = tiktokId(url);
    if (!id) throw new Error("Gebruik een volledige TikTok video-URL met /video/{id}.");
    url.search = "";
    url.hash = "";
    const canonicalUrl = url.toString();
    const metadata = await publicMetadata(`https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`, fetcher);
    return {
      platform: "tiktok",
      externalId: id,
      canonicalUrl,
      embedUrl: `https://www.tiktok.com/player/v1/${id}?controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=1&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=1`,
      thumbnailUrl: safeHttpsUrl(metadata?.thumbnail_url),
      aspectRatio: "9:16",
      suggestedTitle: safeTitle(metadata?.title, "TikTok-video"),
    };
  },
};

const instagramProvider: SocialVideoProvider = {
  platform: "instagram",
  canHandle(url) {
    return isHost(url.hostname, "instagram.com") && /^\/(reel|p)\//.test(url.pathname);
  },
  async resolve(url) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[1];
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Ongeldige Instagram-URL.");
    const contentKind = parts[0] === "p" ? "p" : "reel";
    return {
      platform: "instagram",
      externalId: id,
      canonicalUrl: `https://www.instagram.com/${contentKind}/${id}/`,
      embedUrl: `https://www.instagram.com/${contentKind}/${id}/embed/`,
      aspectRatio: "9:16",
      suggestedTitle: "Instagram-video",
    };
  },
};

const providers: SocialVideoProvider[] = [youtubeProvider, tiktokProvider, instagramProvider];

export async function resolveSocialVideoUrl(sourceUrl: string, fetcher: typeof fetch = fetch): Promise<ResolvedSocialVideo> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error("Ongeldige video-URL.");
  }
  if (url.protocol !== "https:") throw new Error("Alleen HTTPS-video-URL's zijn toegestaan.");
  const provider = providers.find(candidate => candidate.canHandle(url));
  if (!provider) throw new Error("Dit videoplatform of URL-formaat wordt nog niet ondersteund.");
  return provider.resolve(url, fetcher);
}

export function socialVideoDocumentId(video: Pick<ResolvedSocialVideo, "platform" | "externalId" | "canonicalUrl">): string {
  const identity = `${video.platform}:${video.externalId || video.canonicalUrl}`;
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 24);
  return `VIDEO-${digest}`;
}

function availabilityUrl(video: Pick<SocialVideo, "platform" | "sourceUrl">): string {
  if (video.platform === "youtube") return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(video.sourceUrl)}`;
  if (video.platform === "tiktok") return `https://www.tiktok.com/oembed?url=${encodeURIComponent(video.sourceUrl)}`;
  return video.sourceUrl;
}

export async function checkSocialVideoAvailability(
  video: Pick<SocialVideo, "platform" | "sourceUrl">,
  fetcher: typeof fetch = fetch,
): Promise<SocialVideoAvailability> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetcher(availabilityUrl(video), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "VoltVroom-VVOS/1.0 availability-check" },
      cache: "no-store",
    });
    if (response.status === 404 || response.status === 410) return { state: "unavailable", checkedAt, httpStatus: response.status };
    if (response.status >= 200 && response.status < 400) return { state: "available", checkedAt, httpStatus: response.status };
    return { state: "unknown", checkedAt, httpStatus: response.status };
  } catch {
    return { state: "unknown", checkedAt };
  }
}
