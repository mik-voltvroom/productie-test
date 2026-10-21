import { WarrantyBoard } from "@/components/workshop/WarrantyBoard";
import { warrantyClaims } from "@/lib/workshop/sample-data";
export default function WarrantyPage(){return <main className="dashboardPage container"><div className="pageTitle"><div><span className="eyebrow">Zekerheid</span><h1>Garantieclaims</h1><p className="muted">Dekking, diagnose, kosten en besluitvorming transparant beheerd.</p></div></div><WarrantyBoard initialClaims={warrantyClaims}/></main>}
