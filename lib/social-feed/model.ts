export type SocialFeedPlatform = "instagram" | "youtube";

export type SocialFeedItem = {
  id: string;
  platform: SocialFeedPlatform;
  title: string;
  excerpt?: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  publishedAt: string;
  isVideo: boolean;
};
