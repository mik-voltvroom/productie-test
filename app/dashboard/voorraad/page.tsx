"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Vehicle } from "@/types";
import { listVehicles } from "@/lib/repositories/vehicle-repository";
import { eur } from "@/lib/format";
import { grossMargin } from "@/lib/business";
import { centsToEuros } from "@/lib/money";
import { vehicleCommercialSummary } from "@/lib/vehicle/business";
import { calculateOpportunityScore } from "@/lib/vehicle/opportunity";

import { isActiveInventory, matchesInventoryFilter, type InventoryFilter } from "@/lib/vehicle/inventory";

const IDEAL_STOCK_DAYS = 30;
const DEFAULT_INTERVENTION_DAYS = 45;

function money(cents: number) {
  return eur.format(centsToEuros(cents));
}

export default function InventoryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InventoryFilter>("active");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const items = await listVehicles();
        if (active) { setVehicles(items); setError(null); }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Voorraad laden mislukt.");
      } finally { loading = false; }
    };
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("vvos:vehicles", refresh);
    return () => {
      active = false; window.clearInterval(timer);
      window.removeEventListener("vvos:vehicles", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const activeVehicles = useMemo(
    () => vehicles.filter(isActiveInventory),
    [vehicles],
  );

  const cockpit = useMemo(() => {
    const rows = activeVehicles.map(vehicle => ({ vehicle, summary: vehicleCommercialSummary(vehicle) }));
    const knownCosts = rows.filter(row => row.summary.costsKnown);
    const inventoryCapitalCents = knownCosts.reduce((sum, row) => sum + (row.vehicle.costs?.purchasePriceCents ?? 0), 0);
    const expectedMarginCents = knownCosts.reduce((sum, row) => sum + row.summary.marginCents, 0);
    const averageStockDays = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.summary.stockDays, 0) / rows.length) : 0;
    const capitalOver30Cents = rows.filter(row => row.summary.stockDays > IDEAL_STOCK_DAYS)
      .reduce((sum, row) => sum + (row.vehicle.costs?.purchasePriceCents ?? 0), 0);
    const capitalOver45Cents = rows.filter(row => row.summary.stockDays > (row.vehicle.commercial?.maxStockDays ?? DEFAULT_INTERVENTION_DAYS))
      .reduce((sum, row) => sum + (row.vehicle.costs?.purchasePriceCents ?? 0), 0);
    const actionCount = rows.filter(row => row.summary.stockDays > (row.vehicle.commercial?.maxStockDays ?? DEFAULT_INTERVENTION_DAYS)
      || (row.summary.costsKnown && !row.summary.marginOnTarget)).length;
    return { inventoryCapitalCents, expectedMarginCents, averageStockDays, capitalOver30Cents, capitalOver45Cents, actionCount, knownCostCount: knownCosts.length };
  }, [activeVehicles]);

  const filtered = useMemo(
    () => vehicles.filter(v => matchesInventoryFilter(v, status)
      && `${v.brand} ${v.model} ${v.trim} ${v.licensePlate ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [vehicles, query, status],
  );

  return <main className="container dashboardPage">
    <div className="pageTitle"><div><p className="eyebrow">VVOS Management Cockpit</p><h1>Voorraad, marge & statijd</h1><p className="muted">Dagelijkse stuurinformatie: waar zit het voorraadkapitaal, welke marge verwachten we en welke auto vraagt vandaag actie?</p></div><Link className="button" href="/dashboard/voorraad/nieuw">Auto toevoegen via Mobilox</Link></div>
    {error ? <div className="notice noticeError">{error}</div> : null}

    <div className="kpiGrid">
      <div className="card"><p className="eyebrow">Voorraadkapitaal</p><h2>{money(cockpit.inventoryCapitalCents)}</h2><p className="muted">{cockpit.knownCostCount}/{activeVehicles.length} actieve auto's met bekende inkoopprijs</p></div>
      <div className="card"><p className="eyebrow">Verwachte brutomarge</p><h2>{money(cockpit.expectedMarginCents)}</h2><p className="muted">Op basis van actuele verkoopprijs en bekende voertuigkosten</p></div>
      <div className="card"><p className="eyebrow">Gemiddelde statijd</p><h2>{cockpit.averageStockDays} dagen</h2><p className="muted">VV-doel: idealiter minder dan {IDEAL_STOCK_DAYS} dagen</p></div>
      <div className="card"><p className="eyebrow">Actie vandaag</p><h2>{cockpit.actionCount} auto's</h2><p className="muted">Onder doelmarge of voorbij de ingestelde maximale statijd</p></div>
    </div>

    <div className="notice" style={{ marginTop: 18 }}>
      <strong>Kapitaalbewaking:</strong> {money(cockpit.capitalOver30Cents)} staat langer dan {IDEAL_STOCK_DAYS} dagen vast; {money(cockpit.capitalOver45Cents)} staat voorbij de maximale statijd en vraagt een prijs-, marketing- of uitstapbesluit.
    </div>

    <div className="toolbar"><input placeholder="Zoek merk, model of kenteken" value={query} onChange={e=>setQuery(e.target.value)} /><select value={status} onChange={e=>setStatus(e.target.value as InventoryFilter)}><option value="active">Actieve voorraad</option><option value="all">Alle dossiers inclusief historie</option><option value="draft">Concept</option><option value="photography">Fotografie</option><option value="review">Controle</option><option value="available">Beschikbaar</option><option value="reserved">Gereserveerd</option><option value="sold">Verkocht</option><option value="archived">Archief / verwijderd in Mobilox</option></select></div>
    <div className="tableWrap"><table><thead><tr><th>Voertuig</th><th>Status</th><th>Verkoop</th><th>Marge</th><th>Statijd</th><th>Interesse</th><th>Opportunity</th><th>Compleet</th></tr></thead><tbody>{filtered.map(v => {
      const commercial = vehicleCommercialSummary(v);
      const margin = v.costs?.purchasePriceCents ? grossMargin(v.commercial?.soldPriceCents ?? v.priceCents, v.costs) : undefined;
      const opportunity = calculateOpportunityScore(v);
      const incomplete = opportunity.missingInputs.length > 0;
      const interventionDays = v.commercial?.maxStockDays ?? DEFAULT_INTERVENTION_DAYS;
      const needsAction = commercial.stockDays > interventionDays || (commercial.costsKnown && !commercial.marginOnTarget);
      return <tr key={v.id}><td><Link className="tableVehicle" href={`/dashboard/voorraad/${v.id}`}><img src={v.images[0] || "https://placehold.co/140x90?text=Geen+foto"} alt=""/><span><strong>{v.brand} {v.model}</strong><small>{v.trim} · {v.year} · {v.mileageKm.toLocaleString("nl-NL")} km{needsAction ? " · ACTIE" : ""}</small></span></Link></td><td><span className={`statusPill status-${v.status}`}>{v.status}</span></td><td>{money(v.priceCents)}</td><td className={margin !== undefined && commercial.marginOnTarget ? "marginGood" : "marginWarn"}>{margin !== undefined ? money(margin) : "–"}</td><td className={commercial.stockDays > interventionDays ? "marginWarn" : ""}>{commercial.stockDays} d</td><td>{commercial.totalViewCount} views · {commercial.totalLeadCount} leads</td><td title={incomplete ? `Ontbreekt: ${opportunity.missingInputs.join(", ")}` : opportunity.factors.map(f => f.reason).join(" · ")}><strong>{opportunity.score}/100</strong><br/><small>{opportunity.advice.replace("_", " ")}{incomplete ? " · data aanvullen" : ""}</small></td><td>{v.publication?.completenessPercent ?? 0}%</td></tr>;
    })}</tbody></table></div>
  </main>;
}
