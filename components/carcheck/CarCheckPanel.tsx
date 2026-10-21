"use client";
import { useEffect, useState } from "react";
import type { Vehicle } from "@/types";
import { coverage, sections, sectionLabels, type CarCheckReport, type CarCheckCommand, type Inspection } from "@/lib/carcheck/business";
const empty: Inspection = { findings: [], measurements: [], evidenceIds: [], publicSummary: "", publicationApproved: false };
export function CarCheckPanel({ vehicle }: { vehicle: Vehicle }) {
  const [inspection, setInspection] = useState<Inspection>(empty);
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<CarCheckReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const endpoint = `/api/vvos/vehicles/${encodeURIComponent(vehicle.id)}/carcheck`;
  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "CarCheck laden mislukt.");
      if (active) { setReport(body.report); setRevision(body.revision); setInspection(body.report?.inspection ?? empty); }
    }).catch(error => { if (active) { setMessage(error.message + " Vernieuw de pagina voordat u invoert."); setLoadFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);
  async function save(status: CarCheckCommand["status"]) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, inspection, expectedRevision: revision, expectedVehicleUpdatedAt: vehicle.updatedAt }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Opslaan mislukt.");
      setRevision(body.revision); setReport(body.report); setMessage("Centraal opgeslagen. Vrijgegeven versies blijven ongewijzigd bewaard.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Opslaan mislukt."); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${endpoint}/evidence`, { method: "POST", headers: { "content-type": file.type }, body: file });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Upload mislukt.");
      setInspection(current => ({ ...current, evidenceIds: [...current.evidenceIds, body.id] }));
      setMessage("Bewijs geüpload. Sla de inspectie op om het bewijs te koppelen.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload mislukt."); }
    finally { setBusy(false); }
  }
  const progress = coverage(inspection, vehicle.driveType);
  return <section><h2>CarCheck</h2>
    <p>Status: {report?.status ?? "Nog geen inspectie"} · {progress.checked}/{progress.required} toepasselijke controles uitgevoerd. Dit is dekking, geen kwaliteitsscore.</p>
    <p>Concepten en wijzigingen worden pas centraal opgeslagen met de onderstaande knoppen. Offline opslaan wordt niet ondersteund.</p>
    {loading ? <p>Inspectie laden…</p> : null}{message ? <p role="status">{message}</p> : null}
    <fieldset disabled={loading || busy || loadFailed} style={{ border: 0, padding: 0, minWidth: 0 }}>
      {sections.map(section => {
        const finding = inspection.findings.find(item => item.section === section) || { section, result: "unknown" as const, note: "" };
        const change = (patch: Partial<typeof finding>) => setInspection(current => ({ ...current, findings: [...current.findings.filter(item => item.section !== section), { ...finding, ...patch }].sort((a, b) => sections.indexOf(a.section) - sections.indexOf(b.section)) }));
        return <div key={section} className="formGrid"><label>{sectionLabels[section]}<select value={finding.result} onChange={event => change({ result: event.target.value as typeof finding.result })}>
          <option value="unknown">Niet gecontroleerd</option><option value="good">Goed</option><option value="attention">Aandacht</option><option value="critical">Kritiek</option><option value="not_applicable">Niet van toepassing</option>
        </select></label><label>Bevinding {sectionLabels[section]}<input value={finding.note} maxLength={2000} onChange={event => change({ note: event.target.value })}/></label></div>;
      })}
      <h3>Metingen en bronnen</h3>
      {inspection.measurements.map((measurement, index) => <fieldset key={index} className="panel"><legend>Meting {index + 1}</legend>
        {(["label", "unit", "measuredAt", "method", "source"] as const).map(key => <label key={key}>{({ label: "Meetwaarde", unit: "Eenheid", measuredAt: "Meetdatum en tijd (ISO, met tijdzone)", method: "Methode", source: "Apparaat of rapportbron" })[key]}<input value={measurement[key]} onChange={event => setInspection(current => ({ ...current, measurements: current.measurements.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item) }))}/></label>)}
        <label>Waarde<input type="number" step="any" value={Number.isFinite(measurement.value) ? measurement.value : ""} onChange={event => setInspection(current => ({ ...current, measurements: current.measurements.map((item, i) => i === index ? { ...item, value: event.target.value === "" ? NaN : Number(event.target.value) } : item) }))}/></label>
        <label>Soort bron<select value={measurement.sourceKind} onChange={event => setInspection(current => ({ ...current, measurements: current.measurements.map((item, i) => i === index ? { ...item, sourceKind: event.target.value as typeof item.sourceKind } : item) }))}><option value="measurement">Eigen meting</option><option value="document">Document</option><option value="manufacturer">Fabrieksopgave</option><option value="estimate">Schatting</option></select></label>
        <label>Bewijs<select value={measurement.evidenceId ?? ""} onChange={event => setInspection(current => ({ ...current, measurements: current.measurements.map((item, i) => i === index ? { ...item, evidenceId: event.target.value || undefined } : item) }))}><option value="">Selecteer bewijs</option>{inspection.evidenceIds.map((id, i) => <option key={id} value={id}>Bewijs {i + 1}</option>)}</select></label>
        <button type="button" className="button secondary" onClick={() => setInspection(current => ({ ...current, measurements: current.measurements.filter((_, i) => i !== index) }))}>Meting verwijderen uit concept</button>
      </fieldset>)}
      <button type="button" className="button secondary" onClick={() => setInspection(current => ({ ...current, measurements: [...current.measurements, { label: "", value: NaN, unit: "", measuredAt: new Date().toISOString(), method: "", sourceKind: "measurement", source: "" }] }))}>Meetregel toevoegen</button>
      <label>Privébewijs (JPEG, PNG of PDF, maximaal 10 MB)<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={event => void upload(event.target.files?.[0])}/></label>
      <ul>{inspection.evidenceIds.map((id, index) => <li key={id}><a href={`${endpoint}/evidence?evidenceId=${id}`}>Bewijs {index + 1} downloaden</a></li>)}</ul>
      <label>Openbare samenvatting (geen persoonsgegevens)<textarea value={inspection.publicSummary} maxLength={2000} onChange={event => setInspection(current => ({ ...current, publicSummary: event.target.value }))}/></label>
      <label><input type="checkbox" checked={inspection.publicationApproved} onChange={event => setInspection(current => ({ ...current, publicationApproved: event.target.checked }))}/> Samenvatting geschikt voor publicatie na vrijgave</label>
      <div className="actions"><button type="button" className="button secondary" onClick={() => void save("draft")}>Concept opslaan</button><button type="button" className="button secondary" onClick={() => void save("review")}>Ter controle opslaan</button><button type="button" className="button" onClick={() => void save("released")}>Gecontroleerde versie vrijgeven</button></div>
    </fieldset>
  </section>;
}
