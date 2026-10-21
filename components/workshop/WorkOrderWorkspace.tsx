"use client";
import { useMemo, useState } from "react";
import type { InspectionItem, WorkshopTask, WorkOrder } from "@/types";
import { technicians } from "@/lib/workshop/sample-data";
import { workOrderFinancials, workOrderProgress } from "@/lib/workshop/business";
import { eur } from "@/lib/format";

export function WorkOrderWorkspace({ initialOrder }: { initialOrder: WorkOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const financials = useMemo(() => workOrderFinancials(order), [order]);
  const cycleTask = (id: string) => setOrder(o => ({ ...o, tasks: o.tasks.map(t => t.id === id ? { ...t, status: t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : "todo" } : t) }));
  const inspect = (id: string, result: InspectionItem["result"]) => setOrder(o => ({ ...o, inspection: o.inspection.map(i => i.id === id ? { ...i, result } : i) }));
  const assign = (id: string, technicianId: string) => setOrder(o => ({ ...o, tasks: o.tasks.map(t => t.id === id ? { ...t, technicianId } : t) }));
  const addTask = () => setOrder(o => ({ ...o, tasks: [...o.tasks, { id: crypto.randomUUID(), workOrderId: o.id, category: "repair", title: "Nieuwe werkplaatsactie", status: "todo", estimatedMinutes: 30, actualMinutes: 0, required: false } as WorkshopTask] }));
  return <div className="workOrderWorkspace">
    <section className="panel workOrderHero">
      <div><span className="eyebrow">{order.number}</span><h1>{order.vehicleLabel}</h1><p className="muted">{order.customerName} · {order.licensePlate || "Geen kenteken"} · {order.mileageKm.toLocaleString("nl-NL")} km</p></div>
      <div className="dealReadiness pending"><strong>{workOrderProgress(order)}%</strong><span>werkorder gereed</span></div>
    </section>
    <div className="workspaceGrid">
      <main className="stack">
        <section className="panel"><div className="panelHeader"><div><span className="eyebrow">Werkzaamheden</span><h2>Digitale werkorder</h2></div><button className="button secondary" onClick={addTask}>Taak toevoegen</button></div>
          <div className="workshopTaskList">{order.tasks.map(task => <article key={task.id} className={`workshopTask ${task.status}`}>
            <button onClick={() => cycleTask(task.id)}><span>{task.status === "done" ? "✓" : task.status === "in_progress" ? "◐" : "○"}</span></button>
            <div><strong>{task.title}</strong><small>{task.category} · {task.estimatedMinutes} min gepland · {task.actualMinutes} min geboekt</small></div>
            <select value={task.technicianId || ""} onChange={e => assign(task.id, e.target.value)}><option value="">Niet toegewezen</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </article>)}</div>
        </section>
        <section className="panel"><div className="panelHeader"><div><span className="eyebrow">Inspectie</span><h2>Hybride 360° controle</h2></div></div>
          <div className="inspectionTable">{order.inspection.length ? order.inspection.map(item => <article key={item.id}><div><small>{item.section}</small><strong>{item.label}</strong></div><select value={item.result} onChange={e => inspect(item.id, e.target.value as InspectionItem["result"])}><option value="not_checked">Niet gecontroleerd</option><option value="ok">OK</option><option value="attention">Aandacht</option><option value="reject">Afkeur</option></select></article>) : <p className="muted">Nog geen inspectielijst gekoppeld.</p>}</div>
        </section>
        <section className="panel"><span className="eyebrow">Onderdelen</span><h2>Materiaal en bestelling</h2><div className="tableWrap"><table><thead><tr><th>Onderdeel</th><th>Aantal</th><th>Inkoop</th><th>Verkoop</th><th>Status</th></tr></thead><tbody>{order.parts.map(p => <tr key={p.id}><td>{p.description}<small>{p.supplier ? ` · ${p.supplier}` : ""}</small></td><td>{p.quantity}</td><td>{eur.format(p.purchasePriceEur * p.quantity)}</td><td>{eur.format(p.salePriceEur * p.quantity)}</td><td>{p.received ? "Ontvangen" : p.ordered ? "Besteld" : "Te bestellen"}</td></tr>)}</tbody></table></div></section>
      </main>
      <aside className="stack">
        <section className="panel stickyPanel"><span className="eyebrow">Calculatie</span><h2>{eur.format(financials.estimatedInvoice)}</h2><div className="miniRecord"><span>Onderdelen inkoop</span><strong>{eur.format(financials.partsCost)}</strong></div><div className="miniRecord"><span>Onderdelen verkoop</span><strong>{eur.format(financials.partsRevenue)}</strong></div><div className="miniRecord"><span>Arbeid</span><strong>{financials.laborMinutes} min / {eur.format(financials.laborRevenue)}</strong></div><div className="miniRecord"><span>Brutobijdrage</span><strong>{eur.format(financials.grossContribution)}</strong></div></section>
        <section className="panel"><span className="eyebrow">Klantakkoord</span><h2>{order.customerApproval === "pending" ? "Nog nodig" : order.customerApproval === "approved" ? "Goedgekeurd" : "Niet vereist"}</h2><p className="muted">{order.diagnosis || order.complaint}</p><button className="button wide" onClick={() => setOrder(o => ({ ...o, customerApproval: "approved", status: "in_progress" }))}>Registreer akkoord</button></section>
      </aside>
    </div>
  </div>;
}
