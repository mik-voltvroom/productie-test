"use client";
import { useState } from "react";
import type { Deal, DealDocument, DeliveryTask, FinanceApplication, PaymentRecord } from "@/types";
import { canDeliver, dealProgress, openBalanceCents } from "@/lib/deal/business";
import { centsToEuros } from "@/lib/money";

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function DealWorkspace({ deal, initialTasks, payments, documents, finance }: { deal: Deal; initialTasks: DeliveryTask[]; payments: PaymentRecord[]; documents: DealDocument[]; finance?: FinanceApplication }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [taskError, setTaskError] = useState("");
  const paidCents = payments.filter(p => p.status === "paid" && p.type !== "refund").reduce((sum, payment) => sum + payment.amountCents, 0);
  const balanceCents = openBalanceCents(deal, paidCents);
  const progress = dealProgress(deal, tasks);
  const ready = canDeliver(deal, tasks, balanceCents);
  async function cycle(id: string) {
    const current = tasks.find(task => task.id === id);
    if (!current) return;
    const status = current.status === "todo" ? "in_progress" : current.status === "in_progress" ? "done" : "in_progress";
    setTaskError("");
    const response = await fetch(`/api/delivery-tasks/${encodeURIComponent(id)}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const result = await response.json().catch(() => null) as { task?: DeliveryTask; error?: string } | null;
    if (!response.ok || !result?.task) {
      setTaskError(result?.error ?? "Aflevertaak kon niet worden opgeslagen.");
      return;
    }
    setTasks(previous => previous.map(task => task.id === id ? result.task! : task));
  }
  return <div className="dealWorkspace">
    <section className="dealHero panel">
      <div><span className="eyebrow">{deal.id}</span><h1>{deal.customer.name}</h1><p className="muted">Voertuig {deal.vehicleId} · levering {deal.plannedDeliveryAt ? new Date(deal.plannedDeliveryAt).toLocaleString("nl-NL") : "nog niet gepland"}</p></div>
      <div className={`dealReadiness ${ready?"ready":"pending"}`}><strong>{progress}%</strong><span>{ready?"Klaar voor aflevering":"In voorbereiding"}</span></div>
    </section>
    <div className="metrics">
      <div className="metric"><span>Totaal</span><strong>{euro.format(centsToEuros(deal.totalCents))}</strong></div>
      <div className="metric"><span>Betaald</span><strong>{euro.format(centsToEuros(paidCents))}</strong></div>
      <div className="metric"><span>Openstaand</span><strong>{euro.format(centsToEuros(balanceCents))}</strong></div>
      <div className="metric"><span>Garantie</span><strong>{deal.warranty?.months || 0} mnd</strong></div>
    </div>
    <div className="workspaceGrid">
      <section className="panel"><div className="panelHeader"><div><span className="eyebrow">Afleverflow</span><h2>Checklist</h2></div><span className="statusPill">{tasks.filter(t=>t.status==="done").length}/{tasks.length}</span></div>
        {taskError && <p className="syncMessage">{taskError}</p>}
        <div className="deliveryTasks">{tasks.map(t=><button type="button" className={`deliveryTask ${t.status}`} key={t.id} onClick={()=>void cycle(t.id)}><span>{t.status==="done"?"✓":t.status==="in_progress"?"…":"○"}</span><div><strong>{t.title}</strong><small>{t.category} · {t.ownerRole}</small></div></button>)}</div>
      </section>
      <div className="stack">
        <section className="panel"><span className="eyebrow">Betaling</span><h2>Transacties</h2>{payments.map(p=><div className="miniRecord" key={p.id}><strong>{p.type} · {euro.format(centsToEuros(p.amountCents))}</strong><span>{p.status} via {p.provider}</span></div>)}<button className="button wide" type="button">Betaallink aanmaken</button></section>
        <section className="panel"><span className="eyebrow">Financiering</span><h2>{finance?.status || "Niet aangevraagd"}</h2>{finance && <><p>{euro.format(centsToEuros(finance.requestedAmountCents))} · {finance.termMonths} maanden</p><p className="muted">Indicatie {euro.format(centsToEuros(finance.monthlyPaymentCents || 0))} per maand</p></>}</section>
      </div>
    </div>
    <section className="panel"><div className="panelHeader"><div><span className="eyebrow">Dossier</span><h2>Documenten</h2></div><button className="button secondary" type="button">Document genereren</button></div><div className="documentGrid">{documents.map(d=><article key={d.id}><span>{d.type}</span><strong>{d.title}</strong><small>{d.status}</small></article>)}</div></section>
  </div>
}
