"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { WorkOrder, WorkOrderStatus } from "@/types";
import { workshopMetrics, workOrderProgress } from "@/lib/workshop/business";

const columns: { key: WorkOrderStatus; label: string }[] = [
  { key: "planned", label: "Gepland" }, { key: "checked_in", label: "Binnen" }, { key: "diagnosis", label: "Diagnose" },
  { key: "waiting_approval", label: "Akkoord klant" }, { key: "in_progress", label: "In uitvoering" }, { key: "quality_control", label: "Eindcontrole" }, { key: "ready", label: "Gereed" }
];

export function WorkshopBoard({ initialOrders }: { initialOrders: WorkOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const metrics = useMemo(() => workshopMetrics(orders), [orders]);
  const update = (id: string, status: WorkOrderStatus) => setOrders(list => list.map(o => o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o));
  return <>
    <div className="metrics workshopMetrics">
      <div className="metric"><span>Actieve werkorders</span><strong>{metrics.active}</strong></div>
      <div className="metric"><span>Wacht op akkoord</span><strong>{metrics.waiting}</strong></div>
      <div className="metric"><span>Hoge prioriteit</span><strong>{metrics.urgent}</strong></div>
      <div className="metric"><span>Geplande uren</span><strong>{metrics.soldHours} u</strong></div>
    </div>
    <div className="workshopBoard">
      {columns.map(column => <section className="workshopColumn" key={column.key}>
        <header><strong>{column.label}</strong><span>{orders.filter(o => o.status === column.key).length}</span></header>
        {orders.filter(o => o.status === column.key).map(order => <article className={`workOrderCard priority-${order.priority}`} key={order.id}>
          <div className="leadMeta"><span>{order.number}</span><span>{order.priority}</span></div>
          <Link href={`/dashboard/werkorders/${order.id}`}><h3>{order.vehicleLabel}</h3></Link>
          <p>{order.customerName} · {order.licensePlate || "geen kenteken"}</p>
          <div className="progressBar"><i style={{ width: `${workOrderProgress(order)}%` }} /></div>
          <small>{workOrderProgress(order)}% gereed · {new Date(order.plannedStartAt).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
          <select value={order.status} onChange={e => update(order.id, e.target.value as WorkOrderStatus)}>
            {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </article>)}
      </section>)}
    </div>
  </>;
}
