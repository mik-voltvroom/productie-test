"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/types";
import { listLeads, saveLead } from "@/lib/repositories/lead-repository";
import { notificationWarning } from "@/lib/communications/business";
import { responseDeadline, scoreLead } from "@/lib/sales-engine";

import { salesTeam } from "@/lib/sales-team";

const columns: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "Nieuw" },
  { id: "contacted", label: "Contact" },
  { id: "qualified", label: "Gekwalificeerd" },
  { id: "appointment", label: "Afspraak" },
  { id: "won", label: "Gewonnen" },
  { id: "lost", label: "Verloren" },
];

export function SalesPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    let inFlight = false;
    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      await listLeads()
      .then((items) => {
        if (!active) return;
        setLoadError(false);
        setLeads(
          items.map((lead) => {
            const scored = scoreLead(lead);
            return {
              ...lead,
              sales:
                lead.sales ??
                {
                  ...scored,
                  responseDueAt: responseDeadline(
                    scored.score,
                    new Date(lead.createdAt ?? Date.now()),
                  ),
                },
            };
          }),
        );
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { inFlight = false; if (active) setLoading(false); });
    }
    void refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);

  const hot = useMemo(
    () => leads.filter((lead) => lead.sales?.temperature === "hot").length,
    [leads],
  );

  const teamMetrics = useMemo(() => salesTeam.map(member => {
    const assigned = leads.filter(lead => lead.owner === member.name);
    const open = assigned.filter(lead => !["won", "lost"].includes(lead.status ?? "new"));
    const overdue = open.filter(lead => {
      const date = lead.nextActionAt ?? ((lead.status ?? "new") === "new" ? lead.sales?.responseDueAt : undefined);
      return Boolean(date && Number.isFinite(Date.parse(date)) && Date.parse(date) < Date.now());
    }).length;
    const won = assigned.filter(lead => lead.status === "won").length;
    const lost = assigned.filter(lead => lead.status === "lost").length;
    return { ...member, open: open.length, overdue, won, closed: won + lost };
  }), [leads]);

  const filteredLeads = useMemo(() => leads.filter(lead => ownerFilter === "all" || (ownerFilter === "unassigned" ? !lead.owner : lead.owner === ownerFilter)), [leads, ownerFilter]);

  async function assign(lead: Lead, owner: string) {
    const next = { ...lead, owner };
    try {
      await saveLead(next, ["owner"]);
      setLeads(current => current.map(item => item.id === lead.id ? next : item));
      setSaveError("");
    } catch { setSaveError("Medewerker niet opgeslagen. Probeer opnieuw."); }
  }

  async function move(lead: Lead, status: LeadStatus) {
    const next = { ...lead, status };
    try {
      await saveLead(next, ["status"]);
      setLeads((current) => current.map((item) => (item.id === lead.id ? next : item)));
      setSaveError("");
    } catch { setSaveError("Status niet opgeslagen. Probeer opnieuw."); }
  }

  if (loading) return <div className="panel">CRM laden…</div>;

  return (
    <>
      {saveError ? <p className="panel" role="alert">{saveError}</p> : null}
      {loadError ? <p className="panel" role="alert">Leads konden niet worden ververst. De getoonde lijst is mogelijk niet actueel. Controleer uw verbinding; VVOS probeert het elke 30 seconden opnieuw.</p> : null}
      {leads.some(lead => (lead.status ?? "new") === "new" && notificationWarning(lead)) ? <p className="panel" role="alert">Er zijn nieuwe websiteaanvragen zonder bevestigde Chat-melding. Open de onderstaande leads en volg ze rechtstreeks op; laat klanten hun aanvraag niet opnieuw versturen.</p> : null}
      <div className="salesSummary">
        <div className="metric"><span>Hot leads (indicatie)</span><strong>{hot}</strong></div>
        <div className="metric"><span>Open pipeline</span><strong>{leads.filter((lead) => !["won", "lost"].includes(lead.status ?? "new")).length}</strong></div>
        <div className="metric"><span>Afspraken</span><strong>{leads.filter((lead) => lead.status === "appointment").length}</strong></div>
      </div>
      <section className="teamOverview" aria-label="Verkoopresultaten per medewerker">
        {teamMetrics.map(member => (
          <article className="teamOverviewCard" key={member.id}>
            <header><strong>{member.name}</strong><button type="button" className="teamFilterButton" aria-pressed={ownerFilter === member.name} onClick={() => setOwnerFilter(current => current === member.name ? "all" : member.name)}>{ownerFilter === member.name ? "Toon iedereen" : "Bekijk leads"}</button></header>
            <div className="teamOverviewMetrics">
              <div><span>Open leads</span><strong>{member.open}</strong></div>
              <div><span>Actie te laat</span><strong>{member.overdue}</strong></div>
              <div><span>Conversie afgerond</span><strong>{member.closed ? Math.round(member.won / member.closed * 100) + "%" : "–"}</strong></div>
              <div><span>Eerste reactietijd</span><strong title="Nog geen betrouwbaar geregistreerd eerste antwoord">Niet gemeten</strong></div>
            </div>
            <small>Conversie = gewonnen / (gewonnen + verloren). {member.closed} afgesloten leads.</small>
          </article>
        ))}
      </section>
      <div className="pipelineToolbar"><strong>Verkooppipeline <span className="muted">· alle zes fasen</span></strong><label>Medewerker<select aria-label="Filter op medewerker" value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)}><option value="all">Iedereen</option><option value="unassigned">Niet toegewezen</option>{salesTeam.map(member => <option value={member.name} key={member.id}>{member.name}</option>)}</select></label></div>
      <div className="kanban" aria-label="Verkooppipeline met zes fasen">
        {columns.map((column) => (
          <section className="kanbanColumn" key={column.id}>
            <header><strong>{column.label}</strong><span>{filteredLeads.filter((lead) => (lead.status ?? "new") === column.id).length}</span></header>
            {filteredLeads
              .filter((lead) => (lead.status ?? "new") === column.id)
              .map((lead) => (
                <article className="leadCard" key={lead.id}>
                  <div className="leadMeta">
                    <span>{lead.channel}</span>
                    <span className={`temperature ${lead.sales?.temperature}`}>{lead.sales?.score ?? 0}</span>
                  </div>
                  <h3><Link href={`/dashboard/leads/${lead.id}`}>{lead.name}</Link></h3>
                  {notificationWarning(lead) ? <p role="status">{notificationWarning(lead)}</p> : null}
                  {lead.message ? <p className="leadCardMessage" title={lead.message}>{lead.message}</p> : null}
                  <small className="leadCardContact">{lead.phone || lead.email || "Geen contactgegevens"}</small>
                  <label>Medewerker<select aria-label={`Medewerker voor ${lead.name}`} value={lead.owner ?? ""} onChange={event => void assign(lead, event.target.value)}><option value="">Niet toegewezen</option>{salesTeam.map(member => <option key={member.id} value={member.name}>{member.name}</option>)}{lead.owner && !salesTeam.some(member => member.name === lead.owner) ? <option value={lead.owner}>{lead.owner}</option> : null}</select></label>
                  <label>
                    Fase
                    <select value={lead.status ?? "new"} onChange={(event) => move(lead, event.target.value as LeadStatus)}>
                      {columns.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                </article>
              ))}
            {filteredLeads.every(lead => (lead.status ?? "new") !== column.id) ? <p className="kanbanEmpty">Geen leads in deze fase</p> : null}
          </section>
        ))}
      </div>
    </>
  );
}
