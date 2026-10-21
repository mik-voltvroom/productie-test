import { SocialVideo } from "@/components/SocialVideo";
import { listPublishedSocialVideos } from "@/lib/social-video/repository";
import type { SocialVideo as SocialVideoRecord } from "@/lib/social-video/model";

export async function PlacementSocialVideos({ placement, eyebrow, title, intro, limit = 3 }: { placement: keyof SocialVideoRecord["placements"]; eyebrow: string; title: string; intro: string; limit?: number }) {
  const videos = await listPublishedSocialVideos({ placement, limit }).catch(() => []);
  if (videos.length === 0) return null;
  return <section className="section placementVideoSection"><div className="container">
    <div className="sectionHeading splitHeading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><p className="sectionIntro">{intro}</p></div>
    <div className="vehicleVideoGrid">{videos.map(video => <SocialVideo key={video.id} video={video} />)}</div>
  </div></section>;
}
