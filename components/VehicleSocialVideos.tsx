import { SocialVideo } from "@/components/SocialVideo";
import { listPublishedSocialVideos } from "@/lib/social-video/repository";

export async function VehicleSocialVideos({ vehicleId }: { vehicleId: string }) {
  const videos = await listPublishedSocialVideos({ placement: "vehicleDetail", vehicleId, limit: 3 }).catch(() => []);
  if (videos.length === 0) return null;
  return <section className="section vehicleVideoSection">
    <div className="sectionHeading splitHeading"><div><p className="eyebrow">Bekijk deze auto</p><h2>Uitgelegd in de praktijk.</h2></div><p className="sectionIntro">Video's die specifiek bij dit voertuig horen: selectie, techniek, meetwaarden of rijervaring.</p></div>
    <div className="vehicleVideoGrid">{videos.map(video => <SocialVideo key={video.id} video={video} />)}</div>
  </section>;
}
