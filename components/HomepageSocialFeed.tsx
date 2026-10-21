import { listLatestSocialFeed } from "@/lib/social-feed/service";

const INSTAGRAM_URL = "https://www.instagram.com/voltenvroom/";
const YOUTUBE_URL = "https://www.youtube.com/channel/UCLfb6AjYG8bfWNe8wLytV7w";

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export async function HomepageSocialFeed() {
  const items = (await listLatestSocialFeed()).filter(item => item.platform === "youtube" && item.isVideo);
  const videos = items.flatMap(item => {
    try {
      const url = new URL(item.sourceUrl);
      const id = url.searchParams.get("v");
      return url.protocol === "https:" && ["youtube.com", "www.youtube.com"].includes(url.hostname) && id && /^[\w-]{11}$/.test(id) ? [{ ...item, videoId: id }] : [];
    } catch { return []; }
  });

  return <section className="section liveSocialSection" aria-labelledby="live-social-title"><div className="container">
    <div className="sectionHeading"><div><p className="eyebrow">Uit de praktijk</p><h2 id="live-social-title">Onze nieuwste video's.</h2></div></div>
    {videos.length > 0 ? <div className="liveSocialGrid">{videos.map(item => <article className="liveSocialCard liveSocial-youtube" key={item.id}>
      <div className="liveSocialMedia" style={{ aspectRatio: "16 / 9" }}><iframe src={`https://www.youtube-nocookie.com/embed/${item.videoId}`} title={item.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ display: "block", width: "100%", height: "100%", border: 0 }} /></div>
      <div className="liveSocialCopy"><small>{dateLabel(item.publishedAt)}</small><h3>{item.title}</h3><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Bekijk op YouTube <span aria-hidden="true">↗</span></a></div>
    </article>)}</div> : <p>Bekijk onze video's op YouTube.</p>}
    <nav className="socialFeedLinks" aria-label="Volg Volt & Vroom op social media" style={{ marginTop: 24 }}>
      <a className="textButton" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 44 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#ff0033" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z"/><path fill="#fff" d="m9.6 15.6 6.2-3.6-6.2-3.6Z"/></svg>
        YouTube <span aria-hidden="true">↗</span>
      </a>
      <a className="textButton" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 44 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
        Instagram <span aria-hidden="true">↗</span>
      </a>
    </nav>
  </div></section>;
}
