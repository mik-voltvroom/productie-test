export const dynamic = "force-dynamic";

import { LeadWorkspace } from "@/components/sales/LeadWorkspace";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <main className="container dashboardPage"><div className="pageTitle"><div><p className="eyebrow">360° klantbeeld</p><h1>Lead dossier</h1></div></div><LeadWorkspace id={id}/></main>}
