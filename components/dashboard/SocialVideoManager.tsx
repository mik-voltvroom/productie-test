"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { SocialVideoEditor } from "@/components/dashboard/SocialVideoEditor";
import type { SocialVideo } from "@/lib/social-video/model";

type LoadState = "idle" | "loading" | "saving" | "error";

export function SocialVideoManager() {
  const [videos, setVideos] = useState<SocialVideo[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");

  function replaceVideo(video: SocialVideo) {
    setVideos(current => current.map(item => item.id === video.id ? video : item));
  }

  const load = useCallback(async () => {
    setState("loading");
    const response = await fetch("/api/social-videos", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) { setState("error"); setMessage("Video-inbox kon niet worden geladen."); return; }
    const data = await response.json();
    setVideos(data.videos || []);
    setState("idle");
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      sourceUrl: String(form.get("sourceUrl") || ""),
      title: String(form.get("title") || "") || undefined,
      contentType: String(form.get("contentType") || "short"),
      brand: String(form.get("brand") || "") || undefined,
      model: String(form.get("model") || "") || undefined,
      vehicleIds: String(form.get("vehicleIds") || "").split(",").map(value => value.trim()).filter(Boolean),
      tags: String(form.get("tags") || "").split(",").map(value => value.trim()).filter(Boolean),
      featured: form.get("featured") === "on",
      placements: {
        homepage: form.get("homepage") === "on",
        inventory: form.get("inventory") === "on",
        vehicleDetail: form.get("vehicleDetail") === "on",
        carCheck: form.get("carCheck") === "on",
        knowledge: form.get("knowledge") === "on",
      },
    };
    const response = await fetch("/api/social-videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(body?.error || "Video kon niet worden toegevoegd.");
      setState("error");
      return;
    }
    formElement.reset();
    setMessage("Video staat in review en is nog niet publiek zichtbaar.");
    await load();
  }

  async function patchVideo(id: string, patch: Record<string, unknown>) {
    setState("saving");
    setMessage("");
    const response = await fetch(`/api/social-videos/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(body?.error || "Wijziging is niet opgeslagen.");
      setState("error");
      return;
    }
    const data = await response.json();
    replaceVideo(data.video);
    setState("idle");
  }

  async function checkAvailability(id: string) {
    setState("saving");
    setMessage("");
    const response = await fetch(`/api/social-videos/${encodeURIComponent(id)}/availability`, { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(body?.error || "Broncontrole is niet gelukt.");
      setState("error");
      return;
    }
    const data = await response.json();
    replaceVideo(data.video);
    const label = data.availability?.state === "available" ? "beschikbaar" : data.availability?.state === "unavailable" ? "niet beschikbaar" : "niet met zekerheid te controleren";
    setMessage(`Broncontrole afgerond: ${label}.`);
    setState("idle");
  }

  const metrics = useMemo(() => ({
    total: videos.length,
    published: videos.filter(video => video.status === "published").length,
    linked: videos.filter(video => video.vehicleIds.length > 0).length,
    plays: videos.reduce((sum, video) => sum + video.analytics.playClicks, 0),
    vehicleClicks: videos.reduce((sum, video) => sum + video.analytics.vehicleClicks, 0),
  }), [videos]);

  const topVideo = useMemo(() => videos.slice().sort((a, b) => (b.analytics.vehicleClicks + b.analytics.contactClicks + b.analytics.testDriveClicks) - (a.analytics.vehicleClicks + a.analytics.contactClicks + a.analytics.testDriveClicks))[0], [videos]);

  return <main className="container dashboardPage socialVideoDashboard">
    <div className="pageTitle"><div><p className="eyebrow">VVOS · Content Engine</p><h1>Social &amp; Video</h1><p className="muted">Importeer socialvideo's, koppel ze aan voertuigen en bepaal gecontroleerd waar ze op de website verschijnen.</p></div></div>

    <div className="metrics"><div className="metric"><strong>{metrics.total}</strong><span className="muted">video's</span></div><div className="metric"><strong>{metrics.published}</strong><span className="muted">publiek</span></div><div className="metric"><strong>{metrics.plays}</strong><span className="muted">website plays</span></div><div className="metric"><strong>{metrics.vehicleClicks}</strong><span className="muted">doorkliks naar auto's</span></div></div>

    {topVideo && <section className="panel"><div className="panelHeader"><div><p className="eyebrow">Top content</p><h2>{topVideo.title}</h2></div><span className="successDot">{topVideo.analytics.playClicks} plays</span></div><p className="muted">{topVideo.analytics.impressions} impressies · {topVideo.analytics.vehicleClicks} voertuigklikken · {topVideo.analytics.contactClicks + topVideo.analytics.testDriveClicks} directe contactacties · {metrics.linked} video's gekoppeld aan voorraad.</p></section>}

    <section className="panel socialVideoImportPanel"><div className="panelHeader"><div><p className="eyebrow">Manual import</p><h2>Video toevoegen</h2></div><span className="muted">TikTok · YouTube · Instagram</span></div>
      <form className="socialVideoImportForm" onSubmit={addVideo}>
        <label className="span2">Video-URL<input name="sourceUrl" type="url" required placeholder="https://www.youtube.com/watch?v=…" /></label>
        <label className="span2">Titel<input name="title" maxLength={180} placeholder="Bijvoorbeeld: Corolla Hybrid in de praktijk" /></label>
        <label>Type<select name="contentType" defaultValue="short"><option value="short">Short</option><option value="vehicle">Voertuig</option><option value="carcheck">CarCheck</option><option value="explanation">Uitleg</option><option value="review">Review</option><option value="delivery">Aflevering</option><option value="showroom">Showroom</option><option value="news">Nieuws</option></select></label>
        <label>Merk<input name="brand" placeholder="Toyota" /></label>
        <label>Model<input name="model" placeholder="Corolla Touring Sports" /></label>
        <label>Vehicle ID's<input name="vehicleIds" placeholder="VV-2026-041" /></label>
        <label className="span2">Tags<input name="tags" placeholder="hybride, praktijkverbruik, occasion" /></label>
        <fieldset className="span2 socialVideoPlacementField"><legend>Plaatsingen</legend><label><input type="checkbox" name="homepage" /> Homepage</label><label><input type="checkbox" name="inventory" /> Voorraad</label><label><input type="checkbox" name="vehicleDetail" /> Voertuigdetail</label><label><input type="checkbox" name="carCheck" /> CarCheck / VV Verified</label><label><input type="checkbox" name="knowledge" /> Kennisbank</label><label><input type="checkbox" name="featured" /> Uitgelicht</label></fieldset>
        <button className="button" disabled={state === "saving"}>{state === "saving" ? "Opslaan…" : "Voeg toe aan review"}</button>
      </form>
      {message && <p className={`formFeedback ${state === "error" ? "error" : "success"}`} aria-live="polite">{message}</p>}
    </section>

    <section className="panel"><div className="panelHeader"><div><p className="eyebrow">Video-inbox</p><h2>Review &amp; publicatie</h2></div><button className="textLink" type="button" onClick={() => void load()}>Vernieuwen</button></div>
      {state === "loading" ? <p className="muted">Video's laden…</p> : videos.length === 0 ? <p className="muted">Nog geen video's. Voeg hierboven de eerste social-URL toe.</p> : <div className="socialVideoAdminList">{videos.map(video => <article key={video.id}>
        <div className="socialVideoAdminThumb">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" loading="lazy" /> : <span>VV</span>}</div>
        <div className="socialVideoAdminMain"><div><span className={`statusBadge status-${video.status}`}>{video.status}</span><small>{video.platform} · {video.contentType}</small></div><h3>{video.title}</h3><p>{[video.brand, video.model, video.vehicleIds.join(", ")].filter(Boolean).join(" · ") || "Nog niet aan een voertuig gekoppeld"}</p><p>{video.analytics.impressions} impressies · {video.analytics.playClicks} plays · {video.analytics.vehicleClicks} autokliks</p><p className="muted">Bron: {video.sourceState}{video.sourceCheckedAt ? ` · gecontroleerd ${new Date(video.sourceCheckedAt).toLocaleString("nl-NL")}` : ""}</p><div className="socialVideoAdminActions">
          {video.status !== "published" && video.status !== "archived" && video.status !== "unavailable" && <button type="button" onClick={() => void patchVideo(video.id, { status: "published" })}>Publiceren</button>}
          {video.status === "published" && <button type="button" onClick={() => void patchVideo(video.id, { status: "review" })}>Terug naar review</button>}
          <button type="button" disabled={state === "saving"} onClick={() => void checkAvailability(video.id)}>Controleer bron</button>
          {video.status !== "archived" && <button type="button" onClick={() => void patchVideo(video.id, { status: "archived" })}>Archiveren</button>}
          <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer">Bron ↗</a>
        </div>
        <SocialVideoEditor
          video={video}
          disabled={state === "saving"}
          onSaved={saved => replaceVideo(saved)}
          onMessage={(text, error) => { setMessage(text); setState(error ? "error" : "idle"); }}
        />
        </div>
        <div className="socialVideoAdminPlacement">{Object.entries(video.placements).filter(([, enabled]) => enabled).map(([key]) => <span key={key}>{key}</span>)}</div>
      </article>)}</div>}
    </section>
  </main>;
}
