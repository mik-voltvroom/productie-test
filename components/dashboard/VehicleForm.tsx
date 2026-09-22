"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DriveType, Vehicle, VehicleCosts, VehicleStatus } from "@/types";
import { emptyCosts, slugify, validateVehicle } from "@/lib/business";
import { saveVehicle } from "@/lib/repositories/vehicle-repository";
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
  const dirty = useRef(new Set<keyof Vehicle>());
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(initial?.updatedAt);
  const errors = useMemo(() => validateVehicle(vehicle), [vehicle]);
  const completeness = Math.max(0, Math.round(((10 - Math.min(errors.length, 10)) / 10) * 100));
  const set = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => { dirty.current.add(key); setVehicle(v => ({ ...v, [key]: value })); };

  async function save(nextStatus?: VehicleStatus) {
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
        <button className="button wide" type="button" onClick={() => save()}>Opslaan</button>
        <button className="button secondary wide" type="button" disabled={errors.length > 0} onClick={() => save("available")}>Publiceren</button>
        {saveError && <p className="formError" role="alert">{saveError}</p>}
        {saved && <p className="savedNotice">Wijzigingen opgeslagen.</p>}
      </section>
    </aside>
  </div>;
}
