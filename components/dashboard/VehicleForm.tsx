"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DriveType, Vehicle, VehicleCosts, VehicleStatus } from "@/types";
import { emptyCosts, slugify, validateVehicle } from "@/lib/business";
import { saveVehicle } from "@/lib/repositories/vehicle-repository";
import { uploadVehicleImage } from "@/lib/integrations/storage";
import { MarginPanel } from "./MarginPanel";
import { centsToEuros, eurosToCents } from "@/lib/money";
import { CommercialPanel } from "./CommercialPanel";
import { defaultVehicleCommercial, recordVehiclePrice } from "@/lib/vehicle/business";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import { VehicleEditorialPanel } from "./VehicleEditorialPanel";
import styles from "./VehicleEditorialPanel.module.css";

const now = () => new Date().toISOString();
const id = () => `VV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

export function VehicleForm({ initial }: { initial?: Vehicle }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle>(initial ?? {
    id: id(), slug: "", brand: "", model: "", trim: "", year: new Date().getFullYear(), mileageKm: 0, priceCents: 0,
    driveType: "full-hybrid", fuelType: "Benzine / elektrisch", transmission: "Automaat", bodyStyle: "", color: "",
    maintenanceHistory: "unknown", images: [], highlights: [], status: "draft", locationCode: "VOLT_VROOM_GRONINGEN",
    costs: emptyCosts, commercial: { ...defaultVehicleCommercial, priceHistory: [], stockEnteredAt: now() }, publication: { channels: { website: false, merchant: false, google_ads: false, meta: false }, completenessPercent: 0, validationErrors: [] }, updatedAt: now(), createdAt: now()
  });
  const [saveError, setSaveError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadInProgress = useRef(false);
  const dirty = useRef(new Set<keyof Vehicle>());
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(initial?.updatedAt);
  const errors = useMemo(() => validateVehicle(vehicle), [vehicle]);
  const publicImages = useMemo(() => getPublicVehicleImages(vehicle), [vehicle]);
  const publicImageSet = useMemo(() => new Set(publicImages), [publicImages]);
  const completeness = Math.max(0, Math.round(((10 - Math.min(errors.length, 10)) / 10) * 100));
  const set = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => { dirty.current.add(key); setVehicle(v => ({ ...v, [key]: value })); };

  function updatePhotoSelection(imageUrl: string, online: boolean) {
    dirty.current.add("publication");
    setVehicle(current => {
      const selected = new Set(getPublicVehicleImages(current));
      if (online) selected.add(imageUrl); else selected.delete(imageUrl);
      return {
        ...current,
        publication: {
          ...(current.publication ?? { channels: { website: false, merchant: false, google_ads: false, meta: false }, completenessPercent: 0, validationErrors: [] }),
          publicImageUrls: current.images.filter(image => selected.has(image)),
        },
      };
    });
  }

  function updateAllPhotoSelections(online: boolean) {
    dirty.current.add("publication");
    setVehicle(current => ({
      ...current,
      publication: {
        ...(current.publication ?? { channels: { website: false, merchant: false, google_ads: false, meta: false }, completenessPercent: 0, validationErrors: [] }),
        publicImageUrls: online ? [...current.images] : [],
      },
    }));
  }

  function addInternalImage(value: string) {
    const nextImageUrl = value.trim();
    if (!nextImageUrl) return;
    dirty.current.add("images");
    dirty.current.add("publication");
    setVehicle(current => {
      if (current.images.includes(nextImageUrl)) return current;
      return {
        ...current,
        images: [...current.images, nextImageUrl],
        publication: {
          ...(current.publication ?? { channels: { website: false, merchant: false, google_ads: false, meta: false }, completenessPercent: 0, validationErrors: [] }),
          publicImageUrls: getPublicVehicleImages(current),
        },
      };
    });
  }

  function moveImage(from: number, to: number) {
    dirty.current.add("images");
    setVehicle(current => {
      if (from === to || from < 0 || to < 0 || from >= current.images.length || to >= current.images.length) return current;
      const images = [...current.images];
      const [image] = images.splice(from, 1);
      images.splice(to, 0, image);
      return { ...current, images };
    });
  }

  async function uploadImages(files: File[]) {
    if (!files.length || uploadInProgress.current) return;
    uploadInProgress.current = true;
    setUploading(true);
    setSaved(false);
    setUploadError("");
    setUploadNotice("");
    setUploadProgress(0);
    const failures: string[] = [];
    let completed = 0;
    try {
      for (const [index, file] of files.entries()) {
        try {
          const url = await uploadVehicleImage(vehicle.id, file, progress => {
            setUploadProgress(Math.round((index + progress / 100) / files.length * 100));
          });
          addInternalImage(url);
          completed++;
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : "Upload mislukt"}`);
        }
        setUploadProgress(Math.round((index + 1) / files.length * 100));
      }
      setUploadNotice(`${completed} van ${files.length} foto’s toegevoegd. Klik op Opslaan om de wijzigingen te bewaren.`);
      setUploadError(failures.join(" · "));
    } finally {
      uploadInProgress.current = false;
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function removeImage(index: number) {
    dirty.current.add("images");
    dirty.current.add("publication");
    setVehicle(current => {
      const images = current.images.filter((_, imageIndex) => imageIndex !== index);
      const selected = new Set(getPublicVehicleImages(current));
      return {
        ...current,
        images,
        publication: current.publication && Object.prototype.hasOwnProperty.call(current.publication, "publicImageUrls")
          ? { ...current.publication, publicImageUrls: images.filter(image => selected.has(image)) }
          : current.publication,
      };
    });
  }

  async function save(nextStatus?: VehicleStatus) {
    if (uploadInProgress.current) return;
    setSaveError("");
    const finalStatus = nextStatus ?? vehicle.status;
    const savedAt = now();
    const baseCommercial = vehicle.commercial ?? {
      ...defaultVehicleCommercial,
      priceHistory: [],
      stockEnteredAt: vehicle.createdAt ?? savedAt,
    };
    const commercial = vehicle.priceCents > 0
      ? recordVehiclePrice(baseCommercial, vehicle.priceCents, savedAt, "manual")
      : baseCommercial;
    const next: Vehicle = {
      ...vehicle,
      slug: vehicle.slug || slugify(`${vehicle.brand}-${vehicle.model}-${vehicle.trim}-${vehicle.year}`),
      status: finalStatus,
      commercial,
      publication: { ...(vehicle.publication ?? { channels: { website:false, merchant:false, google_ads:false, meta:false }, completenessPercent:0, validationErrors:[] }), publicImageUrls: getPublicVehicleImages(vehicle), completenessPercent: completeness, lastValidatedAt: savedAt, validationErrors: errors, channels: { ...(vehicle.publication?.channels ?? { website:false, merchant:false, google_ads:false, meta:false }), website: finalStatus === "available" && errors.length === 0 } },
      updatedAt: savedAt
    };
    try {
      await saveVehicle(next, expectedUpdatedAt); dirty.current.clear(); setVehicle(next); setExpectedUpdatedAt(next.updatedAt); setSaved(true); setTimeout(() => setSaved(false), 1800);
      if (!initial) router.replace(`/dashboard/voorraad/${next.id}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Opslaan mislukt. Probeer het opnieuw.");
    }
  }

  return <div className={`editorLayout ${styles.layout}`}>
    <div className="editorMain">
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Voertuigdossier</p><h1>{initial ? `${vehicle.brand} ${vehicle.model}` : "Nieuwe auto invoeren"}</h1></div><span className="statusPill">{vehicle.status}</span></div>
        <div className="formGrid">
          <label>Merk<input value={vehicle.brand} onChange={e => set("brand", e.target.value)} /></label>
          <label>Model<input value={vehicle.model} onChange={e => set("model", e.target.value)} /></label>
          <label className="span2">Uitvoering<input value={vehicle.trim} onChange={e => set("trim", e.target.value)} /></label>
          <label>Bouwjaar<input type="number" value={vehicle.year} onChange={e => set("year", Number(e.target.value))} /></label>
          <label>Kilometerstand<input type="number" value={vehicle.mileageKm} onChange={e => set("mileageKm", Number(e.target.value))} /></label>
          <label>Verkoopprijs<input type="number" min="0" step="0.01" value={centsToEuros(vehicle.priceCents)} onChange={e => set("priceCents", eurosToCents(Number(e.target.value), "priceCents"))} /></label>
          <label>Per maand<input type="number" min="0" step="0.01" value={centsToEuros(vehicle.monthlyPriceCents ?? 0)} onChange={e => set("monthlyPriceCents", eurosToCents(Number(e.target.value), "monthlyPriceCents"))} /></label>
          <label>Aandrijving<select value={vehicle.driveType} onChange={e => set("driveType", e.target.value as DriveType)}><option value="full-hybrid">Full hybrid</option><option value="plug-in-hybrid">Plug-in hybrid</option><option value="electric">Elektrisch</option><option value="combustion">Benzine / diesel / LPG</option></select></label>
          <label>Brandstof<input value={vehicle.fuelType} onChange={e => set("fuelType", e.target.value)} /></label>
          <label>Categorie<input value={vehicle.driveType === "combustion" ? "Volt & Vroom Icons" : "VV aanbod"} readOnly /></label>
          <label>Carrosserie<input value={vehicle.bodyStyle} onChange={e => set("bodyStyle", e.target.value)} /></label>
          <label>Kleur<input value={vehicle.color} onChange={e => set("color", e.target.value)} /></label>
          <label>Kenteken<input value={vehicle.licensePlate ?? ""} onChange={e => set("licensePlate", e.target.value.toUpperCase())} /></label>
          <label>VIN<input value={vehicle.vin ?? ""} onChange={e => set("vin", e.target.value.toUpperCase())} /></label>
          <label>Accugezondheid %<input type="number" min="0" max="100" value={vehicle.batteryHealthPercent ?? 0} onChange={e => set("batteryHealthPercent", Number(e.target.value))} /></label>
          <label>Elektrisch bereik km<input type="number" value={vehicle.electricRangeKm ?? 0} onChange={e => set("electricRangeKm", Number(e.target.value))} /></label>
          <label>Verbruik l/100 km<input type="number" step="0.1" value={vehicle.consumptionPer100Km ?? 0} onChange={e => set("consumptionPer100Km", Number(e.target.value))} /></label>
          <label>Garantie maanden<input type="number" value={vehicle.warrantyMonths ?? 0} onChange={e => set("warrantyMonths", Number(e.target.value))} /></label>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Beeldbank</p><h2>Voertuigfoto’s</h2></div><span>{publicImages.length} online · {vehicle.images.length - publicImages.length} offline</span></div>
        <div className="imageInput"><input placeholder="Plak een afbeeldings-URL" value={imageUrl} onChange={event => setImageUrl(event.target.value)} /><button type="button" className="button secondary" onClick={() => { addInternalImage(imageUrl); setImageUrl(""); }}>Toevoegen</button></div>
        <div className="uploadRow">
          <label className="uploadButton">Foto’s uploaden<input type="file" accept="image/*" multiple disabled={uploading} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void uploadImages(files); }} /></label>
          {uploading && <span role="status">Foto’s uploaden: {uploadProgress}%</span>}
          {uploadNotice && <span role="status">{uploadNotice}</span>}
          {uploadError && <span className="formError" role="alert">{uploadError}</span>}
        </div>
        {vehicle.images.length ? <div className="photoBulkActions" role="group" aria-label="Publicatiestatus voor alle foto's"><button type="button" className="button secondary" onClick={() => updateAllPhotoSelections(true)}>Alles online</button><button type="button" className="button secondary" onClick={() => updateAllPhotoSelections(false)}>Alles offline</button></div> : null}
        <div className="photoGrid">{vehicle.images.map((src, index) => {
          const online = publicImageSet.has(src);
          const isMainPhoto = online && publicImages[0] === src;
          return <figure className={online ? "photoOnline" : "photoInternal"} key={`${src}-${index}`}>
            <img src={src} alt={`Voertuigfoto ${index + 1}`} />
            {isMainPhoto ? <span className="photoMainBadge">Hoofdfoto online</span> : null}
            <div className="photoControls"><label><input type="checkbox" checked={online} onChange={event => updatePhotoSelection(src, event.target.checked)} /><span>Online tonen</span></label><button className="photoRemove" type="button" onClick={() => removeImage(index)}>Verwijder</button></div>
            <div className="photoControls" role="group" aria-label={`Volgorde foto ${index + 1}`}>
              <button type="button" className="button secondary" aria-label={`Foto ${index + 1} eerder`} disabled={index === 0 || uploading} onClick={() => moveImage(index, index - 1)}>←</button>
              <label>Positie<select aria-label={`Positie foto ${index + 1}`} value={index} disabled={uploading} onChange={event => moveImage(index, Number(event.target.value))}>{vehicle.images.map((_, position) => <option key={position} value={position}>{position + 1}</option>)}</select></label>
              <button type="button" className="button secondary" aria-label={`Foto ${index + 1} later`} disabled={index === vehicle.images.length - 1 || uploading} onClick={() => moveImage(index, index + 1)}>→</button>
            </div>
            <span className={`photoVisibilityBadge ${online ? "isOnline" : "isInternal"}`}>{online ? "Online" : "Offline"}</span>
          </figure>;
        })}</div>
        <p className="helper">Nieuwe foto’s blijven eerst offline. Zet ze per foto online voor website en feeds. De eerste online foto is automatisch de hoofdfoto; de interne volgorde blijft behouden.</p>
      </section>

      <VehicleEditorialPanel vehicle={vehicle} enabled={Boolean(expectedUpdatedAt)} onSaved={next => {
        setVehicle(current => ({ ...next, ...Object.fromEntries([...dirty.current].map(key => [key, current[key]])) }));
        setExpectedUpdatedAt(next.updatedAt);
      }} />

      <MarginPanel priceCents={vehicle.priceCents} costs={vehicle.costs ?? emptyCosts} targetMarginCents={vehicle.commercial?.targetMarginCents} onChange={costs => set("costs", costs)} />
      <CommercialPanel
        vehicle={vehicle}
        commercial={vehicle.commercial ?? { ...defaultVehicleCommercial, priceHistory: [], stockEnteredAt: vehicle.createdAt }}
        onChange={commercial => set("commercial", commercial)}
      />
    </div>

    <aside className="editorSide">
      <section className="panel stickyPanel">
        <p className="eyebrow">Publicatiecheck</p><div className="completion"><strong>{completeness}%</strong><div><i style={{width:`${completeness}%`}} /></div></div>
        {errors.length ? <ul className="errorList">{errors.map(error => <li key={error}>{error}</li>)}</ul> : <div className="successBox">Klaar voor publicatie</div>}
        <label>Status<select value={vehicle.status} onChange={e => set("status", e.target.value as VehicleStatus)} disabled={vehicle.status === "reserved" || vehicle.status === "sold"}><option value="draft">Concept</option><option value="photography">Fotografie</option><option value="review">Controle</option><option value="available">Beschikbaar</option>{vehicle.status === "reserved" && <option value="reserved">Gereserveerd via deal</option>}{vehicle.status === "sold" && <option value="sold">Verkocht via deal</option>}<option value="archived">Archief</option></select></label>
        <button className="button wide" type="button" disabled={uploading} onClick={() => save()}>Opslaan</button>
        <button className="button secondary wide" type="button" disabled={uploading || errors.length > 0} onClick={() => save("available")}>Publiceren</button>
        {saveError && <p className="formError" role="alert">{saveError}</p>}
        {saved && <p className="savedNotice">Wijzigingen opgeslagen.</p>}
      </section>
    </aside>
  </div>;
}
