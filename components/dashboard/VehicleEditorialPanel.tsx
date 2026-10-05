"use client";
import { useEffect, useRef, useState } from "react";
import type { Vehicle } from "@/types";
import { editorialFor, optionKey, type EditorialCommand } from "@/lib/vehicle/editorial";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import { saveVehicleEditorial } from "@/lib/repositories/vehicle-repository";
import { uploadVehicleImage } from "@/lib/integrations/storage";
import styles from "./VehicleEditorialPanel.module.css";

type CommandInput = EditorialCommand extends infer C ? C extends EditorialCommand ? Omit<C, "revision"> : never : never;

export function VehicleEditorialPanel({ vehicle, onSaved, enabled }: { vehicle: Vehicle; onSaved: (vehicle: Vehicle) => void; enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [optionsBusy, setOptionsBusy] = useState(false);
  const lock = useRef(false);
  const latestVehicle = useRef(vehicle);
  const editorial = editorialFor(vehicle);
  if (vehicle.id !== latestVehicle.current.id || editorial.revision >= editorialFor(latestVehicle.current).revision) latestVehicle.current = vehicle;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const pointer = useRef<{ id: string; x: number; y: number; target: string; moved: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [newOption, setNewOption] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState(editorial.publishedOptionKeys);
  const optionQueue = useRef({ desired: editorial.publishedOptionKeys, version: 0, running: false });
  const photos = editorial.photos.filter(photo => !photo.deletedAt);
  const online = getPublicVehicleImages(vehicle);
  const options = vehicle.highlights.filter(label => optionKey(label).includes(optionKey(query)));
  const selected = new Set(selectedOptionKeys);

  useEffect(() => {
    if (optionQueue.current.running) return;
    optionQueue.current.desired = editorial.publishedOptionKeys;
    setSelectedOptionKeys(editorial.publishedOptionKeys);
  }, [vehicle.id, editorial.revision]);

  async function commit(command: CommandInput): Promise<boolean> {
    if (lock.current || !enabled) return false;
    lock.current = true; setBusy(true); setError(""); setMessage("Opslaan…");
    try {
      const current = latestVehicle.current;
      const next = await saveVehicleEditorial(current, { ...command, revision: editorialFor(current).revision } as EditorialCommand);
      latestVehicle.current = next;
      onSaved(next); setMessage("Opgeslagen");
      if (command.type === "text") setText(null);
      return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Opslaan mislukt."); setMessage(""); return false; }
    finally { lock.current = false; setBusy(false); }
  }

  async function flushOptionQueue(): Promise<void> {
    if (optionQueue.current.running || lock.current || !enabled) return;
    optionQueue.current.running = true; lock.current = true; setBusy(true); setOptionsBusy(true); setError(""); setMessage("Opslaan…");
    try {
      while (true) {
        const version = optionQueue.current.version;
        const keys = optionQueue.current.desired;
        const current = latestVehicle.current;
        const next = await saveVehicleEditorial(current, { type: "options", keys, revision: editorialFor(current).revision });
        latestVehicle.current = next;
        onSaved(next);
        if (version === optionQueue.current.version) break;
      }
      setMessage("Opgeslagen");
    } catch (failure) {
      const persisted = editorialFor(latestVehicle.current).publishedOptionKeys;
      optionQueue.current.desired = persisted;
      setSelectedOptionKeys(persisted);
      setError(failure instanceof Error ? failure.message : "Opslaan mislukt.");
      setMessage("");
    } finally {
      optionQueue.current.running = false; lock.current = false; setOptionsBusy(false); setBusy(false);
    }
  }

  function updateOptionSelection(keys: string[]) {
    const uniqueKeys = [...new Set(keys)];
    optionQueue.current.desired = uniqueKeys;
    optionQueue.current.version += 1;
    setSelectedOptionKeys(uniqueKeys);
    setError(""); setMessage("Opslaan…");
    void flushOptionQueue();
  }

  function move(from: string, to: string) {
    if (from === to) return;
    const ids = photos.map(photo => photo.id);
    const start = ids.indexOf(from), end = ids.indexOf(to);
    if (start < 0 || end < 0) return;
    ids.splice(start, 1); ids.splice(end, 0, from);
    void commit({ type: "reorder", ids });
  }

  return <section className={`panel ${styles.manager}`} aria-label="Websitepublicatie beheren">
    <div className="panelHeader"><div><p className="eyebrow">Publicatieregie</p><h2>Foto’s, opties en tekst</h2></div><span role="status" aria-live="polite">{message}</span></div>
    {!enabled && <p className="helper">Sla het nieuwe voertuig eerst op om de publicatie te beheren.</p>}
    {error && <p role="alert" className="formError">{error}</p>}
    <fieldset disabled={busy || !enabled} className={styles.fields}>
      <legend>Voertuigfoto’s · {photos.length} totaal · {online.length} online</legend>
      <p className="helper">Sleep foto’s naar de gewenste positie. De eerste online foto is de hoofdfoto. Wijzigingen worden automatisch opgeslagen.</p>
      <div className={styles.grid}>
        {photos.map((photo, index) => <figure key={photo.id} className={`${styles.photo} ${target === photo.id ? styles.target : ""} ${dragged === photo.id ? styles.dragging : ""}`}
          data-photo-id={photo.id}
          onPointerDown={event => {
            if (busy || !enabled || event.button !== 0 || (event.target as HTMLElement).closest("button,input,label")) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            pointer.current = { id: photo.id, x: event.clientX, y: event.clientY, target: photo.id, moved: false };
          }}
          onPointerMove={event => {
            const action = pointer.current;
            if (!action) return;
            if (!action.moved && Math.hypot(event.clientX - action.x, event.clientY - action.y) < 6) return;
            action.moved = true; setDragged(action.id);
            const under = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-photo-id]");
            if (under?.dataset.photoId) { action.target = under.dataset.photoId; setTarget(action.target); }
            if (event.clientY < 110) window.scrollBy(0, -20);
            else if (event.clientY > window.innerHeight - 60) window.scrollBy(0, 20);
          }}
          onPointerUp={event => {
            const action = pointer.current;
            pointer.current = null; setDragged(null); setTarget(null);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            if (action?.moved && !busy) move(action.id, action.target);
          }}
          onPointerCancel={() => { pointer.current = null; setDragged(null); setTarget(null); }}>
          <div className={styles.preview}><img src={photo.url} alt={`Voertuigfoto ${index + 1}`} loading="lazy" draggable={false} /><span className={styles.position}>{index + 1}</span>{online[0] === photo.url && <span className={styles.main}>Hoofdfoto</span>}</div>
          <label className={styles.check}><input type="checkbox" checked={online.includes(photo.url)} onChange={event => void commit({ type: "visibility", id: photo.id, online: event.target.checked })} />{online.includes(photo.url) ? "Online tonen" : "Alleen intern"}</label>
          <div className={styles.actions}>
            <button type="button" disabled={index === 0} aria-label={`Foto ${index + 1} naar voren`} onClick={() => move(photo.id, photos[index - 1].id)}>←</button>
            <button type="button" disabled={index === photos.length - 1} aria-label={`Foto ${index + 1} naar achteren`} onClick={() => move(photo.id, photos[index + 1].id)}>→</button>
            <button type="button" aria-label={`Foto ${index + 1} verwijderen`} onClick={() => { if (window.confirm("Deze foto uit VVOS en de website verwijderen? Een volgende Mobilox-sync zet hem niet terug.")) void commit({ type: "delete", id: photo.id }); }}>Verwijder</button>
          </div>
        </figure>)}
      </div>
      <div className={styles.add}><label>Afbeeldings-URL<input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></label><button className="button secondary" type="button" onClick={() => { void commit({ type: "add", url }); setUrl(""); }}>Toevoegen</button>
        <label className="uploadButton">Foto’s uploaden<input type="file" multiple accept="image/*" onChange={async event => {
          const files = Array.from(event.target.files ?? []); if (!files.length) return;
          setBusy(true); setError("");
          try { for (const [index, file] of files.entries()) {
            const uploaded = await uploadVehicleImage(vehicle.id, file, progress => setMessage(`Foto ${index + 1}/${files.length}: ${progress}%`));
            if (!await commit({ type: "add", url: uploaded })) break;
            setBusy(true);
          } }
          catch (failure) { setError(failure instanceof Error ? failure.message : "Upload mislukt."); }
          finally { setBusy(false); event.target.value = ""; }
        }} /></label>
      </div>
      <p className="helper">Nieuwe foto’s blijven eerst alleen intern. Verwijderen in Mobilox verwijdert geen foto uit VVOS.</p>
    </fieldset>
    <fieldset disabled={(busy && !optionsBusy) || !enabled} className={styles.fields}>
      <legend>Opties op de website · {vehicle.highlights.filter(label => selected.has(optionKey(label))).length} geselecteerd</legend>
      <p className="helper">Vink per optie aan wat bezoekers op de voertuigadvertentie mogen zien. Wijzigingen worden automatisch opgeslagen.</p>
      <div className={styles.toolbar}><label>Opties zoeken<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Zoek bijvoorbeeld stoelverwarming" /></label>
        <button className="button secondary" type="button" onClick={() => updateOptionSelection(vehicle.highlights.map(optionKey))}>Alles selecteren</button>
        <button className="button secondary" type="button" onClick={() => updateOptionSelection([])}>Alles deselecteren</button>
      </div>
      <div className={styles.options}>{options.map(label => <label key={optionKey(label)} className={styles.check}><input type="checkbox" checked={selected.has(optionKey(label))} onChange={event => {
        const keys = new Set(optionQueue.current.desired); if (event.target.checked) keys.add(optionKey(label)); else keys.delete(optionKey(label));
        updateOptionSelection([...keys]);
      }} />{label}</label>)}</div>
      {!options.length && <p className="helper">Geen opties gevonden.</p>}
      <div className={styles.add}><label>Optie handmatig toevoegen<input value={newOption} onChange={event => setNewOption(event.target.value)} maxLength={120} /></label><button type="button" className="button secondary" disabled={busy || !newOption.trim()} onClick={async () => { if (await commit({ type: "addOption", label: newOption })) setNewOption(""); }}>Optie toevoegen</button></div>
      <p className="helper">Nieuwe Mobilox-opties worden toegevoegd zonder ze automatisch te publiceren. Bestaande keuzes blijven behouden.</p>
    </fieldset>
    <fieldset disabled={busy || !enabled} className={styles.fields}>
      <legend>Advertentietekst</legend>
      <p className="helper">Bronvelden worden apart bewaard. Alleen de VVOS-websitetekst wordt gepubliceerd.</p>
      {Object.entries(editorial.content.sourceTexts).map(([field, value]) => <details key={field} className={styles.source}><summary>Mobilox · {field}</summary><textarea aria-label={`Mobilox ${field}`} rows={5} value={value} readOnly /><button type="button" className="button secondary" onClick={() => setText(value)}>Overnemen als concept</button></details>)}
      {!Object.keys(editorial.content.sourceTexts).length && <p className="helper">Nog geen afzonderlijke Mobilox-brontekst opgeslagen. Deze wordt bij de volgende import vastgelegd.</p>}
      <label>VVOS-websitetekst<textarea rows={7} value={text ?? editorial.content.websiteText ?? vehicle.description ?? ""} onChange={event => setText(event.target.value)} /></label>
      <button className="button secondary" type="button" disabled={text === null} onClick={() => void commit({ type: "text", text: text ?? "" })}>Websitetekst opslaan</button>
    </fieldset>
  </section>;
}
