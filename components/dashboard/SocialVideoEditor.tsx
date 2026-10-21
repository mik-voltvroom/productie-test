"use client";

import { FormEvent, useState } from "react";
import type { SocialVideo } from "@/lib/social-video/model";

export function SocialVideoEditor({
  video,
  disabled,
  onSaved,
  onMessage,
}: {
  video: SocialVideo;
  disabled?: boolean;
  onSaved: (video: SocialVideo) => void;
  onMessage: (message: string, error?: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onMessage("");
    const form = new FormData(event.currentTarget);
    const optional = (name: string) => String(form.get(name) || "").trim() || null;
    const payload = {
      title: String(form.get("title") || "").trim(),
      contentType: String(form.get("contentType") || "short"),
      brand: optional("brand"),
      model: optional("model"),
      carCheckId: optional("carCheckId"),
      vvVerifiedId: optional("vvVerifiedId"),
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

    const response = await fetch(`/api/social-videos/${encodeURIComponent(video.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      onMessage(body?.error || "Reviewgegevens konden niet worden opgeslagen.", true);
      setSaving(false);
      return;
    }

    const data = await response.json();
    onSaved(data.video);
    onMessage("Reviewgegevens opgeslagen.");
    setSaving(false);
  }

  return <details className="socialVideoEditor">
    <summary>Review gegevens &amp; plaatsingen</summary>
    <form onSubmit={submit} className="socialVideoEditForm">
      <label className="span2">Titel<input name="title" required maxLength={180} defaultValue={video.title} /></label>
      <label>Type<select name="contentType" defaultValue={video.contentType}><option value="short">Short</option><option value="vehicle">Voertuig</option><option value="carcheck">CarCheck</option><option value="explanation">Uitleg</option><option value="review">Review</option><option value="delivery">Aflevering</option><option value="showroom">Showroom</option><option value="news">Nieuws</option></select></label>
      <label>Merk<input name="brand" defaultValue={video.brand || ""} /></label>
      <label>Model<input name="model" defaultValue={video.model || ""} /></label>
      <label>Vehicle ID's<input name="vehicleIds" defaultValue={video.vehicleIds.join(", ")} placeholder="VV-2026-041" /></label>
      <label>VV Verified ID<input name="vvVerifiedId" defaultValue={video.vvVerifiedId || ""} /></label>
      <label>CarCheck ID<input name="carCheckId" defaultValue={video.carCheckId || ""} /></label>
      <label className="span2">Tags<input name="tags" defaultValue={video.tags.join(", ")} /></label>
      <fieldset className="span2 socialVideoPlacementField"><legend>Plaatsingen</legend>
        <label><input type="checkbox" name="homepage" defaultChecked={video.placements.homepage} /> Homepage</label>
        <label><input type="checkbox" name="inventory" defaultChecked={video.placements.inventory} /> Voorraad</label>
        <label><input type="checkbox" name="vehicleDetail" defaultChecked={video.placements.vehicleDetail} /> Voertuigdetail</label>
        <label><input type="checkbox" name="carCheck" defaultChecked={video.placements.carCheck} /> CarCheck / VV Verified</label>
        <label><input type="checkbox" name="knowledge" defaultChecked={video.placements.knowledge} /> Kennisbank</label>
        <label><input type="checkbox" name="featured" defaultChecked={video.featured} /> Uitgelicht</label>
      </fieldset>
      <button className="button" type="submit" disabled={disabled || saving}>{saving ? "Opslaan…" : "Review opslaan"}</button>
    </form>
  </details>;
}
