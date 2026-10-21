import { SocialVideo } from "@/components/SocialVideo";
import { listPublishedSocialVideos } from "@/lib/social-video/repository";

const INSTAGRAM_PROFILE_URL = process.env.NEXT_PUBLIC_INSTAGRAM_PROFILE_URL?.trim();

export async function HomepageSocialVideos() {
  const videos = await listPublishedSocialVideos({ placement: "homepage", limit: 12 }).catch(() => []);
  if (videos.length === 0) return null;

  const instagramVideos = videos.filter(video => video.platform === "instagram");
  const otherVideos = videos.filter(video => video.platform !== "instagram");
  const prioritizedVideos = [...instagramVideos, ...otherVideos].slice(0, 4);
  const [latestVideo, ...recentVideos] = prioritizedVideos;

  return <section className="section homeVideoSection" aria-labelledby="social-video-title"><div className="container">
    <div className="sectionHeading splitHeading"><div><p className="eyebrow">Volg Volt &amp; Vroom op Instagram</p><h2 id="social-video-title">De nieuwste video. Recht uit de praktijk.</h2></div><div><p className="sectionIntro">Instagram is onze primaire videobron. Nieuwe binnenkomers, controles, uitleg en eerlijke praktijkervaring staan hier vooraan.</p><div className="socialVideoLinks">{INSTAGRAM_PROFILE_URL ? <a className="textButton" href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer">Volg op Instagram <span aria-hidden="true">→</span></a> : null}<a className="textButton" href="/uit-de-praktijk">Bekijk alle video's <span aria-hidden="true">→</span></a></div></div></div>

    <div className="latestSocialVideo">
      <div className="latestSocialVideoLabel"><span>Nieuw</span><strong>{latestVideo.platform === "instagram" ? "Laatste Instagram-video" : "Laatste geplaatste video"}</strong></div>
      <SocialVideo video={latestVideo} />
    </div>

    {recentVideos.length > 0 && <div className="recentSocialVideos">
      <div className="recentSocialVideosHead"><span>Meer uit de praktijk</span><small>Instagram eerst, daarna overige gepubliceerde video&apos;s</small></div>
      <div className="homeVideoGrid">{recentVideos.map(video => <SocialVideo key={video.id} video={video} compact />)}</div>
    </div>}
  </div></section>;
}
