import styles from "@/components/stock-alerts/stock-alerts.module.css";
import {redirect} from "next/navigation";
import {requireVerifiedSession} from "@/lib/auth/session";
import {isLocalDemoAuthBypassAllowed} from "@/lib/auth/config";
import {hasPermission} from "@/lib/auth/permissions";
import {alertConfig} from "@/lib/stock-alerts/config";
import {alertOverview} from "@/lib/stock-alerts/admin-repository";
import {matchesAlert} from "@/lib/stock-alerts/business";
import {listPublishedVehicleRecords} from "@/lib/repositories/public-vehicle-repository";
import {StockAlertAdmin} from "@/components/stock-alerts/StockAlertAdmin";
export const dynamic="force-dynamic";
export default async function AlertsDashboard({searchParams}:{searchParams?:Promise<{cursor?:string}>}){
  const user=await requireVerifiedSession();
  if(!user&&!isLocalDemoAuthBypassAllowed())redirect("/login");
  if(user&&!hasPermission(user.role,"stockAlerts.read"))redirect("/dashboard?reason=forbidden");
  const config=alertConfig(),params=await searchParams;
  const cursor=params?.cursor&&/^[a-f0-9]{64}$/.test(params.cursor)?params.cursor:undefined;
  let overview;try{overview=await alertOverview(cursor);}catch{}
  let unmatched:number|undefined;
  if(overview)try{const inventory=await listPublishedVehicleRecords();unmatched=overview.sample.filter(criteria=>!inventory.some(vehicle=>matchesAlert(vehicle,criteria))).length;}catch{}
  const ranked=(values:Record<string,number>)=>Object.entries(values).sort((a,b)=>b[1]-a[1]).slice(0,10);
  return <main className={`dashboardPage container ${styles.dashboard}`}><div className="pageTitle"><div><span className="eyebrow">VVOS · Vraag en aanbod</span><h1>Voorraadalerts</h1><p>Actieve zoekwensen zijn geen telling van unieke kopers of bewezen koopintentie.</p></div></div>
    <section className="panel"><h2>Activering en configuratie</h2><p>Publieke inschrijvingen: {config.flags.signups?"Aan":"Uit"} · Matching: {config.flags.matching?"Aan":"Uit"} · Verzending: {config.flags.sending?"Aan":"Uit"}.</p><p>Dagoverzicht vanaf 09:00 Europe/Amsterdam · maximaal {config.maxVehicles} voertuigen per mail · maximaal één overzicht per lokale kalenderdag.</p><p>Providercontract: {config.configured?"Geconfigureerd; levering alleen bewezen door providerstatus":"Niet gereed; echte verzending geblokkeerd"}.</p>{config.missing.length>0&&<ul>{config.missing.map(name=><li key={name}>{name}</li>)}</ul>}<a href="/dashboard/voorraadalerts/preview">Bekijk synthetische e-mailvoorbeelden</a></section>
    {!overview?<section className="panel" role="status"><h2>Gegevens niet beschikbaar</h2><p>Er zijn geen aantallen vastgesteld. Controleer de databaseconfiguratie en indexen.</p></section>:<>
      <div className="metrics"><div className="metric"><strong>{overview.active}</strong>Actieve zoekwensen</div><div className="metric"><strong>{overview.pending}</strong>Onbevestigd</div><div className="metric"><strong>{overview.recent}</strong>Aanmeldingen laatste 7 dagen</div><div className="metric"><strong>{overview.queued}</strong>In wachtrij</div><div className="metric"><strong>{overview.failed}</strong>Mislukt / uitkomst controleren</div></div>
      <section className="panel"><h2>Verwerking</h2><p>Laatste volledig geslaagde worker-run: {overview.control?.lastSuccessfulRun??"Nog niet uitgevoerd"}.</p><p>Een provideracceptatie is geen bewijs van bezorging. Onbekende verzenduitkomsten vereisen provideronderzoek; daarvoor bestaat geen retryknop.</p></section>
      <section className="panel"><h2>Vraag naar voorraad</h2><p>Verdeling op basis van {overview.sampleCount} geldige actieve zoekwensen, maximaal 500. Eén actieve inschrijving per genormaliseerd e-mailadres; verlopen en gestopte wensen tellen hier niet mee.</p><p>Zonder huidige voorraadmatch in dit deeloverzicht: {unmatched===undefined?"Onbekend":unmatched}.</p><h3>Merken</h3><ul>{ranked(overview.brands).map(([name,count])=><li key={name}>{name}: {count}</li>)}</ul><h3>Modellen</h3><ul>{ranked(overview.models).map(([name,count])=><li key={name}>{name}: {count}</li>)}</ul><h3>Budgetbanden</h3><ul>{ranked(overview.budgets).map(([name,count])=><li key={name}>{name}: {count}</li>)}</ul></section>
      <h2>Zoekwensen — maximaal 50 per pagina</h2><StockAlertAdmin rows={overview.rows} canManage={!user||hasPermission(user.role,"stockAlerts.manage")}/>{overview.next&&<a className="button secondary" href={`/dashboard/voorraadalerts?cursor=${encodeURIComponent(overview.next)}`}>Volgende pagina</a>}
    </>}
  </main>;
}
