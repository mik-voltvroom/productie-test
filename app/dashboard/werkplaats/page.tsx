import { WorkshopBoard } from "@/components/workshop/WorkshopBoard";
import { workOrders } from "@/lib/workshop/sample-data";
export default function WorkshopPage(){return <main className="dashboardPage container"><div className="pageTitle"><div><span className="eyebrow">Layer 06</span><h1>Werkplaats</h1><p className="muted">Planning, voortgang en capaciteit in één operationeel bord.</p></div><a className="button" href="/dashboard/werkorders/wo-1008">Open voorbeeldwerkorder</a></div><WorkshopBoard initialOrders={workOrders}/></main>}
