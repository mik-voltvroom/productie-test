import { listLatestSocialFeed } from "@/lib/social-feed/service";

const INSTAGRAM_URL = "https://www.instagram.com/voltenvroom/";
const YOUTUBE_URL = "https://www.youtube.com/channel/UCLfb6AjYG8bfWNe8wLytV7w";

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export async function HomepageSocialFeed() {
  const items = await listLatestSocialFeed();
  if (items.length === 0) return null;

  return <section className="section liveSocialSection" aria-labelledby="live-social-title"><div className="container">
    <div className="sectionHeading splitHeading"><div><p className="eyebrow">Volg Volt &amp; Vroom</p><h2 id="live-social-title">Nieuw op Instagram en YouTube.</h2></div><div><p className="sectionIntro">Binnenkomers, uitleg en ervaringen rechtstreeks uit onze eigen kanalen.</p><div className="socialFeedLinks"><a className="textButton" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram <span aria-hidden="true">→</span></a><a className="textButton" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">YouTube <span aria-hidden="true">→</span></a></div></div></div>
    <div className="liveSocialGrid">{items.map(item => <a className={`liveSocialCard liveSocial-${item.platform}`} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" key={item.id}>
      <div className="liveSocialMedia">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="socialVideoFallback" aria-hidden="true"><b>VV</b></span>}<span className="liveSocialPlatform">{item.platform === "instagram" ? "Instagram" : "YouTube"}</span>{item.isVideo && <span className="liveSocialPlay" aria-hidden="true">▶</span>}</div>
      <div className="liveSocialCopy"><small>{dateLabel(item.publishedAt)}</small><h3>{item.title}</h3><span>Bekijk bericht <span aria-hidden="true">→</span></span></div>
    </a>)}</div>
  </div></section>;
}
