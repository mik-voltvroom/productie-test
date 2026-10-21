"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Vehicle } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasPermission } from "@/lib/auth/permissions";
import { sohVehicleSnapshot } from "@/lib/soh/business";
import { sohMeasurementSchema, type SohReportState } from "@/lib/soh/certificate";
import { SohVehicleCard } from "./SohCertificate";
import styles from "./SohCertificate.module.css";

export function VehicleSohPanel({ vehicle, pendingVehicleChanges = false }: { vehicle: Vehicle; pendingVehicleChanges?: boolean }) {
  const { role, loading } = useAuth();
  const [state, setState] = useState<SohReportState | null>(null);
  const [soh, setSoh] = useState(""); const [method, setMethod] = useState(""); const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const url = `/api/vvos/vehicles/${encodeURIComponent(vehicle.id)}/soh`;
  const canWrite = role !== null && hasPermission(role, "vehicles.soh.write");
  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    setState(null); setError(""); setSaved(false); setSoh(""); setMethod(""); setDate("");
    void fetch(url, { cache:"no-store", credentials:"same-origin", signal:controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "SOH-rapport laden mislukt.");
      if (controller.signal.aborted) return;
      setState(result);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Laden mislukt."); });
    return () => controller.abort();
  }, [url, loading]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaved(false);
    if (pendingVehicleChanges) { setError("Sla eerst de interne voertuiggegevens op."); return; }
    const measurement = sohMeasurementSchema.safeParse({ sohPercent:soh.trim() ? Number(soh.replace(",", ".")) : NaN, method, measuredAt:date });
    if (!measurement.success || !state) { setError("Vul SOH (0–100%), meetmethode en een geldige meetdatum in."); return; }
    setBusy(true);
    try {
      const response = await fetch(url, { method:"POST", credentials:"same-origin", headers:{"content-type":"application/json"},
        body:JSON.stringify({ ...measurement.data, expectedVehicleUpdatedAt:vehicle.updatedAt, expectedRevision:state.revision }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Validatie mislukt.");
      setState(result); setSaved(true); setSoh(""); setMethod(""); setDate("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Validatie mislukt."); }
    finally { setBusy(false); }
  }
  let card;
  try { card = sohVehicleSnapshot(vehicle); } catch { card = null; }
  return <section className={`panel ${styles.panel}`} aria-labelledby="soh-heading"><h2 id="soh-heading">SOH-rapport</h2>
    <p>Leg een meting vast, valideer deze en open het A4-certificaat om te printen of als PDF op te slaan.</p>
    {card ? <SohVehicleCard vehicle={card} /> : <p role="alert">Voertuiggegevens zijn onvolledig. Controleer het dossier in Mobilox.</p>}
    {state?.report && <p>Laatst gevalideerd: {state.report.sohPercent.toLocaleString("nl-NL")}% · {state.report.measuredAt.split("-").reverse().join("-")} · {state.report.method}</p>}
    {pendingVehicleChanges && <p role="status" className="helper">Sla eerst de interne voertuiggegevens op voordat je een SOH-meting valideert.</p>}
    {canWrite && <form onSubmit={save}><fieldset className={styles.form} disabled={pendingVehicleChanges || busy || !state || !card}>
      <legend>Nieuwe SOH-meting</legend>
      <label>Gemeten SOH (%)<input name="soh" type="number" min="0" max="100" step="0.01" required value={soh} onChange={event => setSoh(event.target.value)} /></label>
      <label>Meetmethode<input name="method" maxLength={120} required placeholder="Bijv. diagnosetest / meetapparaat" value={method} onChange={event => setMethod(event.target.value)} /></label>
      <label>Meetdatum<input name="date" type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
    </fieldset><p className="helper">Met validatie bevestig je de meting voor dit voertuig. De actuele voertuigkaart wordt bij het rapport vastgelegd.</p>
      <button className="button" type="submit" disabled={pendingVehicleChanges || busy || !state || !card}>{busy ? "Valideren…" : "Meting valideren en opslaan"}</button>
    </form>}
    {!loading && !canWrite && <p className="helper">Je kunt rapporten bekijken. Voor validatie zijn sales-, workshop-, admin- of ownerrechten nodig.</p>}
    {state?.report && <div className={styles.actions}><Link className="button secondary" href={`/dashboard/voorraad/${encodeURIComponent(vehicle.id)}/soh`}>Certificaat previewen / printen</Link></div>}
    {error && <p role="alert" className="formError">{error}</p>}{saved && <p role="status">Meting gevalideerd. Het certificaat is klaar.</p>}
  </section>;
}
