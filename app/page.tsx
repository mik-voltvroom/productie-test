"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

const mobiloxPhotos = [
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
];

type StudioPhoto = { id: string; url: string; name: string; publication: "Intern" | "Goedgekeurd" | "Gepubliceerd"; advertisementReady: boolean };

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<StudioPhoto[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [studioPhotos, setStudioPhotos] = useState<StudioPhoto[]>([]);

  useEffect(() => () => photosRef.current.forEach(photo => URL.revokeObjectURL(photo.url)), []);
  useEffect(() => { photosRef.current = studioPhotos; }, [studioPhotos]);

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).filter(file => file.type.startsWith("image/"));
    setStudioPhotos(current => [...current, ...selected.map(file => ({ id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name, publication: "Intern" as const, advertisementReady: false }))]);
    event.target.value = "";
  }

  function move(id: string, direction: -1 | 1) {
    setStudioPhotos(current => {
      const index = current.findIndex(photo => photo.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current]; [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return <main className="page-shell"><section className="media-panel">
    <header className="panel-header"><div><p className="eyebrow">VVOS / VOERTUIG / MEDIA</p><h1>Fotobeheer</h1></div><div className="icon-badge" aria-hidden="true">▧</div></header>
    <section className="module module-external" aria-labelledby="mobilox-title"><div className="module-head"><div className="module-title"><span aria-hidden="true">▧</span><h2 id="mobilox-title">Mobilox Foto&apos;s</h2></div><span className="tag">Externe bron</span></div><p className="muted">Bestaande voertuigfoto&apos;s vanuit de Mobilox-koppeling. Deze blijven ongewijzigd en hebben een eigen bronvolgorde.</p><div className="thumb-row">{mobiloxPhotos.map((photo, index) => <div key={photo} className="thumb-card"><img src={photo} alt={`Mobilox foto ${index + 1}`} /></div>)}</div></section>
    <section className="module module-local" aria-labelledby="studio-title"><div className="module-head"><div className="module-title"><span aria-hidden="true">◌</span><h2 id="studio-title">VV 360° Studio</h2></div><span className="tag success">Eigen media</span></div><p className="muted">Eigen uploads, 360°-sessies, bewerking en publicatiestatus blijven volledig gescheiden van Mobilox.</p><input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} /><div className="action-grid"><button className="action-card" type="button" onClick={() => inputRef.current?.click()}><span aria-hidden="true">↥</span>Foto&apos;s uploaden</button><button className="action-card" type="button" disabled={sessionStarted} onClick={() => setSessionStarted(true)}><span aria-hidden="true">◉</span>{sessionStarted ? "Fotosessie actief" : "Fotosessie starten"}</button></div><div className="session-row"><span className="muted small">360°-sessie</span><span className="tag">{sessionStarted ? "Actief" : "Niet gestart"}</span></div>{studioPhotos.length ? <div className="studio-grid">{studioPhotos.map((photo, index) => <article className="studio-photo" key={photo.id}><img src={photo.url} alt={`VV 360° Studio foto ${index + 1}`} /><div className="photo-meta"><span>#{index + 1}</span><select value={photo.publication} aria-label={`Publicatiestatus ${photo.name}`} onChange={event => setStudioPhotos(current => current.map(item => item.id === photo.id ? { ...item, publication: event.target.value as StudioPhoto["publication"] } : item))}><option>Intern</option><option>Goedgekeurd</option><option>Gepubliceerd</option></select></div><label><input type="checkbox" checked={photo.advertisementReady} onChange={event => setStudioPhotos(current => current.map(item => item.id === photo.id ? { ...item, advertisementReady: event.target.checked } : item))} /> Bron voor advertentiefoto</label><div className="photo-actions"><button type="button" disabled={index === 0} onClick={() => move(photo.id, -1)}>Eerder</button><button type="button" disabled={index === studioPhotos.length - 1} onClick={() => move(photo.id, 1)}>Later</button></div></article>)}</div> : <p className="empty">Nog geen eigen Studiomedia.</p>}</section>
    <p className="caption">Testopstelling: beide modules delen het voertuig-ID, maar niet opslag, volgorde, bewerking of publicatiestatus.</p>
  </section></main>;
}
