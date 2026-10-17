import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { requireVerifiedSession } from "@/lib/auth/session";
import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { seoSnapshot } from "@/lib/seo/business";
import { publicStockCondition } from "@/lib/vehicle/business";
import styles from "./seo.module.css";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const user = await requireVerifiedSession();
  if (!user && !isLocalDemoAuthBypassAllowed()) redirect("/login?reason=session");
  // Reuse integration visibility: owner/admin/marketing. Layout authentication alone is insufficient.
  if (user && (!hasPermission(user.role, "integrations.read") || !hasPermission(user.role, "vehicles.read"))) redirect("/dashboard?reason=forbidden");
  noStore();
  const checkedAt = new Date().toISOString();
  let snapshot;
  try { snapshot = seoSnapshot(await listPublicVehicles(), process.env, checkedAt); }
  catch { return <main className="dashboardPage container"><div className="pageTitle"><h1>SEO-controle</h1></div><section className="panel" role="status"><h2>Voorraadcontrole niet beschikbaar</h2><p>P1 · De publieke bron kon niet volledig worden gelezen. Aantallen, voertuigcontroles en sitemapdekking zijn onbekend. Herstel de bronverbinding en vernieuw deze pagina.</p><p>Gecontroleerd op {checkedAt}. Er is geen lege voorraad vastgesteld.</p></section></main>; }
  const issues = snapshot.vehicles.reduce((count, vehicle) => count + vehicle.issues.length, 0);
  return <main className={`dashboardPage container ${styles.page}`}>
    <div className="pageTitle"><div><span className="eyebrow">VVOS · Website</span><h1>SEO-controle</h1><p className="muted">{snapshot.source}. Dit overzicht bewijst geen Google-indexatie.</p></div></div>
    <section className="panel"><h2>Controlebereik</h2><p>Omgeving: {snapshot.environment} · {snapshot.origin}</p><p>Momentopname: <time dateTime={checkedAt}>{checkedAt}</time></p><p>Volledige publieke voertuigselectie en {snapshot.routeFamilies.length} routefamilies beoordeeld. Statische paginatitels, live HTTP en Google-resultaten zijn hier niet gecontroleerd.</p><p>Live HTTP: {snapshot.liveHttp} · Search Console: {snapshot.searchConsole} · PageSpeed: {snapshot.pageSpeed}. Core Web Vitals: onbekend.</p></section>
    <div className="metrics" aria-label="Controletellingen"><div className="metric"><strong>{snapshot.vehicles.length}</strong>Publieke voertuigen</div><div className="metric"><strong>{snapshot.vehicles.filter(v => v.sitemap).length}</strong>Voertuigen volgens sitemapbeleid</div><div className="metric"><strong>{issues}</strong>Gegevens- en redactiewaarschuwingen</div><div className="metric"><strong>{snapshot.indexable ? "Productie" : "Noindex"}</strong>Indexeringsbeleid</div></div>
    <section className="panel"><h2>Indexering per routefamilie</h2><ul>{snapshot.routeFamilies.map(family => <li key={family.name}><strong>{family.name}</strong>: {family.policy}. Sitemap: {family.sitemap ? "ja" : "nee"}.</li>)}</ul></section>
    <section className="panel"><h2>Taken en vervolgcontroles</h2><p>Conditiebeleid: uitsluitend gebruikte occasions, inclusief voertuigen met 0 km. Bevestigd op {publicStockCondition.confirmedAt}; gedeeld door website-schema en Merchant-feed.</p><p>Historische voertuiglinks verwijzen uitsluitend naar een actuele publieke auto. Onbekende oude adressen vragen bronbewijs.</p><p>P2 · Controleer lange metadata in de preview en bevestig ontbrekende feiten bij de bron. Alleen Mobilox beheert de broninhoud.</p><p>Er draait geen automatische crawler bij het openen van dit overzicht. Open de externe rapporten voor actuele Google-resultaten: <a href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(snapshot.origin + "/")}`} target="_blank" rel="noopener noreferrer">Search Console</a> · <a href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(snapshot.origin + "/")}`} target="_blank" rel="noopener noreferrer">PageSpeed Insights</a>.</p></section>
    <section aria-labelledby="seo-vehicles"><h2 id="seo-vehicles">Publieke voertuigcontroles</h2><div className={styles.vehicles}>{snapshot.vehicles.map(vehicle => <details className="panel" key={vehicle.id}>
      <summary><strong>{vehicle.title}</strong><span>{vehicle.issues.length} waarschuwingen</span></summary>
      <p>{vehicle.status}</p><p><Link href={vehicle.url} target="_blank" rel="noopener noreferrer">{vehicle.url}</Link></p>
      <div className={styles.preview}>{vehicle.image && <img src={vehicle.image} alt="Publieke hoofdfoto" width={240} height={160} loading="lazy" />}<div><h3>{vehicle.title}</h3><p>{vehicle.description}</p></div></div>
      <p>Schema: {vehicle.schema} · Offer: {vehicle.offer ? "aanwezig" : "afwezig"} · Sitemapbeleid: {vehicle.sitemap ? "opgenomen" : "uitgesloten"}.</p>
      {vehicle.issues.length ? <ul>{vehicle.issues.map((issue, i) => <li key={i}>{issue} Actie: controleer het betreffende bronveld of de metadata-preview.</li>)}</ul> : <p>Geen lokale waarschuwingen in de gecontroleerde velden.</p>}
      <small>Gecontroleerd op {vehicle.checkedAt}. Dit is een lokale berekening; geen externe schemavalidatie.</small>
    </details>)}</div></section>
  </main>;
}
