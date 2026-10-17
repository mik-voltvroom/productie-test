import {notFound} from "next/navigation";
import {BrandLogo} from "@/components/BrandLogo";
import {StockAlertAccess} from "@/components/stock-alerts/StockAlertAccess";
import {privateRobots} from "@/lib/seo/business";
import type {TokenPurpose} from "@/lib/stock-alerts/business";
export const dynamic="force-dynamic";
export const metadata={title:"Beheer je voorraadalert | Volt & Vroom",robots:privateRobots,referrer:"no-referrer" as const};
const pages:Record<string,{purpose:TokenPurpose;title:string}>={bevestigen:{purpose:"confirm",title:"Bevestig jouw voorraadalert."},beheren:{purpose:"manage",title:"Jouw autowensen."},uitschrijven:{purpose:"unsubscribe",title:"Voorraadalert stoppen."}};
export default async function AccessPage({params}:{params:Promise<{action:string}>}){
  const {action}=await params;const page=pages[action];if(!page)notFound();
  return <main className="container legalPage"><BrandLogo href="/"/><p className="eyebrow">Persoonlijke voorraadalert</p><h1>{page.title}</h1><StockAlertAccess key={page.purpose} purpose={page.purpose}/></main>;
}
