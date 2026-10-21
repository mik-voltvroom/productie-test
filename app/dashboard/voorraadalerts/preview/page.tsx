import styles from "@/components/stock-alerts/stock-alerts.module.css";
import {redirect} from "next/navigation";
import {requireVerifiedSession} from "@/lib/auth/session";
import {isLocalDemoAuthBypassAllowed} from "@/lib/auth/config";
import {hasPermission} from "@/lib/auth/permissions";
import {criteriaSchema} from "@/lib/stock-alerts/business";
import {renderAlertMail} from "@/lib/stock-alerts/email";
import {alertConfig} from "@/lib/stock-alerts/config";
import type {Vehicle} from "@/types";
export const dynamic="force-dynamic";
export default async function EmailPreview(){
  const user=await requireVerifiedSession();if(!user&&!isLocalDemoAuthBypassAllowed())redirect("/login");if(user&&!hasPermission(user.role,"stockAlerts.read"))redirect("/dashboard?reason=forbidden");
  const origin=alertConfig().origin||"https://example.invalid";
  const vehicle={id:"synthetic-preview",slug:"synthetic-preview",brand:"Voorbeeldmerk",model:"Voorbeeldmodel",trim:"Elektrisch",priceCents:2495000,year:2022,mileageKm:45000,status:"available",images:["https://www.voltvroom.nl/editorial/home-electric-card-v1.jpg"]} as Vehicle;
  const input={to:"synthetic@example.invalid",reference:"synthetic-preview",origin,criteria:criteriaSchema.parse({drive:"electric",maxPriceCents:3000000}),tokens:{confirm:"c".repeat(43),manage:"m".repeat(43),unsubscribe:"u".repeat(43)}};
  const digest=renderAlertMail({...input,kind:"digest",vehicles:[vehicle]}),confirmation=renderAlertMail({...input,kind:"confirmation",vehicles:[]});
  return <main className={`dashboardPage container ${styles.dashboard}`}><h1>E-mailvoorbeelden</h1><p>Uitsluitend synthetische gegevens. Er wordt niets verstuurd; de voorbeeldlinks geven geen toegang tot een inschrijving.</p><a href="/dashboard/voorraadalerts">Terug naar voorraadalerts</a><section className="panel"><h2>Dagoverzicht</h2><iframe title="Voorbeeld voorraadalertmail" sandbox="" srcDoc={digest.html} style={{width:"100%",maxWidth:650,height:1100,border:0}}/><details><summary>Plain-textversie</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{digest.text}</pre></details></section><section className="panel"><h2>Bevestigingsmail</h2><iframe title="Voorbeeld bevestigingsmail" sandbox="" srcDoc={confirmation.html} style={{width:"100%",maxWidth:650,height:700,border:0}}/><details><summary>Plain-textversie</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{confirmation.text}</pre></details></section></main>;
}
