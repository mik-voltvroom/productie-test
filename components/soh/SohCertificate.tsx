import { validateSohCertificate, type SohCertificate as Certificate, type SohVehicleSnapshot, type SohHistoryPoint } from "@/lib/soh/certificate";
import { comparableSohHistory } from "@/lib/soh/history";
import styles from "./SohCertificate.module.css";

const date = (value: string) => value.split("-").reverse().join("-");
const timestamp = (value: string) => new Intl.DateTimeFormat("nl-NL", { timeZone:"Europe/Amsterdam", dateStyle:"short", timeStyle:"short" }).format(new Date(value));

export function SohVehicleCard({ vehicle }: { vehicle: SohVehicleSnapshot }) {
  return <section className={styles.vehicle} aria-label="Voertuiggegevens">
    <div><p className={styles.label}>Voertuig</p><h2>{vehicle.brand} {vehicle.model}</h2><p className={styles.trim}>{vehicle.trim || "Uitvoering niet aangeleverd"}</p>
      <dl className={styles.details}>
        <div><dt>Chassisnummer (VIN)</dt><dd>{vehicle.vin || "Niet aangeleverd"}</dd></div>
        <div><dt>Bouwjaar</dt><dd>{vehicle.year}</dd></div>
        <div><dt>Kilometerstand</dt><dd>{vehicle.mileageKm.toLocaleString("nl-NL")} km</dd></div>
        {vehicle.licensePlate && <div><dt>Kenteken</dt><dd>{vehicle.licensePlate}</dd></div>}
      </dl>
    </div>
    {vehicle.photoUrl && <img className={styles.photo} src={vehicle.photoUrl} width={360} height={240} alt={`${vehicle.brand} ${vehicle.model} — eerste voertuigfoto`} />}
  </section>;
}

function SohHistory({ report, history, unavailable }: { report:Certificate; history:SohHistoryPoint[]; unavailable:boolean }) {
  if (unavailable) return <section className={styles.history}><h3>SOH-meetverloop</h3><p>Historische metingen zijn momenteel niet beschikbaar. De gevalideerde meting hierboven blijft geldig.</p></section>;
  const points = comparableSohHistory(report, history);
  if (points.length < 2) return <section className={styles.history}><h3>SOH-meetverloop</h3><p>Onvoldoende vergelijkbare meetpunten. Er is geen capaciteitsverloop berekend.</p></section>;
  const first = Date.parse(points[0].measuredAt), last = Date.parse(points.at(-1)!.measuredAt);
  const coords = points.map(point => ({ ...point, x:40 + (Date.parse(point.measuredAt) - first) / (last - first) * 350, y:110 - point.sohPercent }));
  return <section className={styles.history}><h3>SOH-meetverloop · {points.length} metingen</h3>
    <svg viewBox="0 0 430 140" role="img" aria-label="Geregistreerde SOH-metingen, dezelfde meetmethode. Geen geschatte batterijcapaciteit.">
      <title>SOH-meetverloop</title>
      <desc>{points.map(point => `${date(point.measuredAt)}: ${point.sohPercent.toLocaleString("nl-NL")}%`).join("; ")}</desc>
      {[0,50,100].map(value => <g key={value}><line x1="40" x2="390" y1={110-value} y2={110-value} className={styles.chartGrid} /><text x="0" y={114-value}>{value}%</text></g>)}
      <polyline points={coords.map(point => `${point.x},${point.y}`).join(" ")} className={styles.chartLine} />
      {coords.map(point => <circle key={point.id} cx={point.x} cy={point.y} r="3" className={styles.chartPoint}><title>{`${date(point.measuredAt)}: ${point.sohPercent.toLocaleString("nl-NL")}%`}</title></circle>)}
      <text x="40" y="135">{date(points[0].measuredAt)}</text><text x="390" y="135" textAnchor="end">{date(points.at(-1)!.measuredAt)}</text>
    </svg>
    <p>Geregistreerde metingen met dezelfde methode; geen voorspelling of capaciteitsberekening.</p>
  </section>;
}

export function SohCertificate({ report, history = [], historyUnavailable = false, printedAt }: { report:Certificate; history?:SohHistoryPoint[]; historyUnavailable?:boolean; printedAt?:string }) {
  const data = validateSohCertificate(report);
  const vehicle = data.vehicle;
  return <article className={`${styles.sheet} sohCertificateSheet`} aria-label="Volt & Vroom SOH-certificaat"><div className={styles.content} data-soh-content>
    <header className={styles.header}><img src="/brand/vv-logo-horizontal-outlined.svg" width={250} height={50} alt="Volt & Vroom" />
      <div><h1>SOH RAPPORT</h1><p>Rapportnummer {data.id}</p></div></header>
    <section className={styles.hero} aria-label="Voertuig en gemeten batterijgezondheid">
      <div className={styles.heroVehicle}>
        {vehicle.photoUrl ? <img className={styles.heroPhoto} src={vehicle.photoUrl} width={540} height={360} alt={`${vehicle.brand} ${vehicle.model} — eerste voertuigfoto`} /> : <p className={styles.noPhoto}>Geen voertuigfoto aangeleverd</p>}
        <h2 title={`${vehicle.brand} ${vehicle.model}`}>{vehicle.brand} {vehicle.model}</h2>
        <p className={styles.heroTrim} title={vehicle.trim}>{vehicle.trim || "Uitvoering niet aangeleverd"}</p>
      </div>
      <div className={styles.gauge}>
        <svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="84" className={styles.ringTrack} /><circle cx="100" cy="100" r="84" pathLength="100" strokeDasharray={`${data.sohPercent} 100`} transform="rotate(-90 100 100)" className={styles.ringValue} /></svg>
        <div><p>STATE OF HEALTH</p><strong>{data.sohPercent.toLocaleString("nl-NL", { maximumFractionDigits:2 })}<span>%</span></strong><p>Volgens gevalideerde meting</p></div>
      </div>
      <dl className={`${styles.details} ${styles.heroDetails}`}>
        <div><dt>Chassisnummer (VIN)</dt><dd>{vehicle.vin || "Niet aangeleverd"}</dd></div>
        <div><dt>Bouwjaar</dt><dd>{vehicle.year}</dd></div>
        <div><dt>Kilometerstand</dt><dd>{vehicle.mileageKm.toLocaleString("nl-NL")} km</dd></div>
        {vehicle.licensePlate && <div><dt>Kenteken</dt><dd>{vehicle.licensePlate}</dd></div>}
      </dl>
    </section>
    {vehicle.battery.length > 0 && <section className={styles.battery} aria-label="Aangeleverde batterijgegevens"><h3>Aangeleverde batterijgegevens</h3><dl>{vehicle.battery.map(item => <div key={item.label}><dt title={item.label}>{item.label}</dt><dd title={item.value}>{item.value}</dd></div>)}</dl></section>}
    <div className={styles.lower}>
      <section className={styles.measurement}><h3>Meetinformatie</h3><dl className={styles.details}>
        <div><dt>Meetdatum</dt><dd>{date(data.measuredAt)}</dd></div><div><dt>Meetmethode / bron</dt><dd>{data.method}</dd></div>
        <div><dt>Validatie</dt><dd>{timestamp(data.verifiedAt)}</dd></div><div><dt>Medewerker</dt><dd>{data.verifiedBy}</dd></div>
      </dl></section>
      <SohHistory report={data} history={history} unavailable={historyUnavailable} />
    </div>
    <section className={styles.explanation}><h3>Wat betekent SOH?</h3><p>State of Health geeft volgens de meetbron de batterijgezondheid weer ten opzichte van de oorspronkelijke toestand. Dit rapport legt de gevalideerde meting en voertuiggegevens vast. SOH is geen garantie voor toekomstig bereik of levensduur en is geen directe meting van de bruikbare batterijcapaciteit.</p></section>
    <footer className={styles.footer}><span>Volt &amp; Vroom | Groningen</span><span>Intern gevalideerd rapport</span><span>Printdatum: {printedAt ? timestamp(printedAt) : "nog niet afgedrukt"}</span></footer>
  </div></article>;
}
