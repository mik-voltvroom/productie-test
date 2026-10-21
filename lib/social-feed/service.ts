import type { SocialFeedItem } from "@/lib/social-feed/model";
import { fetchInstagramFeed, fetchYouTubeFeed } from "@/lib/social-feed/providers";

export async function listLatestSocialFeed(): Promise<SocialFeedItem[]> {
  const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || "";
  const youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || "";
  const results = await Promise.allSettled([
    fetchInstagramFeed(instagramToken),
    fetchYouTubeFeed(youtubeChannelId),
  ]);

  return results.flatMap(result => result.status === "fulfilled" ? result.value : [])
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 6);
}
