"use client";
import { useState } from "react";
import { CarCheckPanel } from "@/components/carcheck/CarCheckPanel";
import Link from "next/link";
import type { Vehicle } from "@/types";
import { emptyCosts } from "@/lib/business";
import { saveVehicle } from "@/lib/repositories/vehicle-repository";
import { MarginPanel } from "./MarginPanel";
import { CommercialPanel } from "./CommercialPanel";
import { VehicleRangePanel } from "./VehicleRangePanel";
import { defaultVehicleCommercial } from "@/lib/vehicle/business";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import { vehicleSpecifications } from "@/lib/vehicle/specifications";
import { VehicleSohPanel } from "@/components/soh/VehicleSohPanel";
import { VehicleDossierSection } from "./VehicleDossierSection";
import styles from "./VehicleEditorialPanel.module.css";

export function VehicleForm({ initial }: { initial?: Vehicle }) {
  const [vehicle, setVehicle] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [rangeDirty, setRangeDirty] = useState(false);
  if (!vehicle) return <section className="panel"><h1>Nieuwe auto toevoegen</h1><p>Voeg de auto toe in Mobilox en selecteer deze voor de website. Het dossier verschijnt na de synchronisatie automatisch in VVOS.</p><Link href="/dashboard/voorraad">Terug naar voorraad</Link></section>;
  const current = vehicle;
  const photos = getPublicVehicleImages(vehicle);
  async function save() {
    setBusy(true); setError(""); setSaved(false);
    try { setVehicle(await saveVehicle({ ...current, costs: current.costs ?? emptyCosts, commercial: current.commercial ?? { ...defaultVehicleCommercial, priceHistory: [] } }, current.updatedAt)); setSaved(true); setRangeDirty(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Opslaan mislukt."); }
    finally { setBusy(false); }
  }
  return <div className={`editorMain ${styles.layout} ${styles.dossier}`}>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Voertuigdossier</p><h1>{vehicle.brand} {vehicle.model}</h1><p>{vehicle.trim}</p></div><span className="statusPill">{vehicle.status}</span></div>
        <p className="helper">Foto’s, advertentietekst, opties en voertuiggegevens worden in Mobilox beheerd en automatisch overgenomen. Reserveringen en verkopen verlopen via het verkoopdossier.</p>
        <button type="button" className="button" disabled={busy} onClick={save}>{busy ? "Opslaan…" : "Interne gegevens opslaan"}</button>
        {error && <p role="alert" className="formError">{error}</p>}{saved && <p role="status">Interne gegevens opgeslagen.</p>}
        {!!vehicle.publication?.validationErrors?.length && <div><h2>Controleer in Mobilox</h2><ul>{vehicle.publication.validationErrors.map(message => <li key={message}>{message}</li>)}</ul></div>}
      </section>
      <VehicleDossierSection title="Showroomkaart A4">
        <p className="helper">Open de showroomkaart om te printen of als PDF op te slaan. Sla aangepaste interne gegevens eerst op.</p>
        <Link className="button secondary" href={`/dashboard/voorraad/${encodeURIComponent(vehicle.id)}/showroomkaart`}>Showroomkaart openen / printen</Link>
      </VehicleDossierSection>
      <VehicleDossierSection title="CarCheck"><CarCheckPanel vehicle={vehicle}/></VehicleDossierSection>
      <VehicleDossierSection title="SOH-rapport">
        <VehicleSohPanel vehicle={vehicle} pendingVehicleChanges={rangeDirty || busy} />
      </VehicleDossierSection>
      <VehicleDossierSection title="Voertuiggegevens">
        <dl>{vehicleSpecifications(vehicle).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </VehicleDossierSection>
      <VehicleDossierSection title={`Voertuigfoto’s · ${photos.length}`}><div className="photoGrid">{photos.map((src, index) => <figure key={src}><img src={src} alt={`${vehicle.brand} ${vehicle.model} — foto ${index + 1}`} width={1920} height={1280} loading="lazy" /></figure>)}</div></VehicleDossierSection>
      <VehicleDossierSection title="Advertentietekst"><p style={{ whiteSpace: "pre-line" }}>{vehicle.description || "Geen advertentietekst aangeleverd."}</p></VehicleDossierSection>
      <VehicleDossierSection title="Opties en uitrusting"><ul>{vehicle.highlights.map(option => <li key={option}>{option}</li>)}</ul></VehicleDossierSection>
      <fieldset disabled={busy} className={styles.fields}>
        <legend>Interne gegevens</legend>
        <VehicleDossierSection title="WLTP en praktijkbereik"><VehicleRangePanel vehicle={vehicle} onChange={rangeOverrides => { setVehicle(v => v && ({ ...v, rangeOverrides })); setSaved(false); setRangeDirty(true); }} /></VehicleDossierSection>
        <VehicleDossierSection title="Marge en kosten"><MarginPanel priceCents={vehicle.priceCents} costs={vehicle.costs ?? emptyCosts} targetMarginCents={vehicle.commercial?.targetMarginCents} onChange={costs => setVehicle(v => v && ({ ...v, costs }))} /></VehicleDossierSection>
        <VehicleDossierSection title="Commercieel dossier"><CommercialPanel vehicle={vehicle} commercial={vehicle.commercial ?? { ...defaultVehicleCommercial, priceHistory: [] }} onChange={commercial => setVehicle(v => v && ({ ...v, commercial }))} /></VehicleDossierSection>
      </fieldset>
  </div>;
}
