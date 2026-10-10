import { validateSohCertificate, type SohCertificate as Certificate, type SohVehicleSnapshot } from "@/lib/soh/certificate";
import styles from "./SohCertificate.module.css";

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

export function SohCertificate({ report }: { report: Certificate }) {
  const data = validateSohCertificate(report);
  return <article className={`${styles.sheet} sohCertificateSheet`} aria-label="Volt & Vroom SOH-certificaat"><div className={styles.content} data-soh-content>
    <header className={styles.header}><img src="/brand/vv-logo-horizontal-outlined.svg" width={250} height={50} alt="Volt & Vroom" /><span>VV SOH-certificaat</span></header>
    <section className={styles.title}><h1>VVSOH</h1><h2>Rapport batterijgezondheid</h2><p>Vastgelegd door Volt &amp; Vroom</p></section>
    <SohVehicleCard vehicle={data.vehicle} />
    <section className={styles.score}><div><h2>State of Health</h2><p>Batterijgezondheid volgens meetbron</p></div><strong>{data.sohPercent.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}<span>%</span></strong></section>
    <dl className={styles.details}>
      <div><dt>Meetdatum</dt><dd>{data.measuredAt.split("-").reverse().join("-")}</dd></div>
      <div><dt>Meetmethode / bronreferentie</dt><dd>{data.method}</dd></div>
    </dl>
    <section className={styles.battery}><h3>Batterijgegevens · Mobilox-opgave</h3>
      {data.vehicle.battery.length ? <dl className={styles.details}>{data.vehicle.battery.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <p>Geen batterijgegevens aangeleverd.</p>}
    </section>
    <section className={styles.explanation}><h3>Bevindingen &amp; toelichting</h3><p>Dit certificaat legt de opgegeven SOH-meting en voertuiggegevens vast op het moment van validatie. SOH is geen garantie voor toekomstig bereik of levensduur. Bruikbare batterijcapaciteit is niet uit deze meting afgeleid.</p></section>
    <dl className={`${styles.details} ${styles.validation}`}><div><dt>Gevalideerd door medewerker</dt><dd>{data.verifiedBy}</dd></div><div><dt>Validatiedatum</dt><dd>{new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", dateStyle: "short", timeStyle: "short" }).format(new Date(data.verifiedAt))}</dd></div><div><dt>Paraaf</dt><dd className={styles.signature}>&nbsp;</dd></div></dl>
    <footer className={styles.footer}><span>Volt &amp; Vroom | Groningen</span><span>Rapport {data.id}</span></footer>
  </div></article>;
}
