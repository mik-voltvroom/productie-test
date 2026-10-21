export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { CustomerPortal } from "@/components/deals/CustomerPortal";
import { sampleDeals,sampleDocuments,samplePayments,sampleTasks } from "@/lib/deal/sample-data";
export default async function Page({params}:{params:Promise<{token:string}>}){if(process.env.VVOS_DATA_MODE === "firebase" || process.env.VVOS_ENV === "production") notFound(); const {token}=await params; const deal=sampleDeals.find(d=>d.portalToken===token); if(!deal) notFound(); return <CustomerPortal deal={deal} tasks={sampleTasks.filter(t=>t.dealId===deal.id)} payments={samplePayments.filter(p=>p.dealId===deal.id)} documents={sampleDocuments.filter(d=>d.dealId===deal.id)}/>}
