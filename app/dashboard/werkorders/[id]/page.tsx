export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { WorkOrderWorkspace } from "@/components/workshop/WorkOrderWorkspace";
import { workOrders } from "@/lib/workshop/sample-data";
export default async function WorkOrderPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const order=workOrders.find(o=>o.id===id);if(!order)notFound();return <main className="dashboardPage container"><WorkOrderWorkspace initialOrder={order}/></main>}
