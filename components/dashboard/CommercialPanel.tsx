"use client";

import type { Vehicle, VehicleCommercial } from "@/types";
import { centsToEuros, eurosToCents } from "@/lib/money";
import { eur } from "@/lib/format";
import { vehicleCommercialSummary } from "@/lib/vehicle/business";

function dateValue(value?: string): string {
  return value?.slice(0, 10) ?? "";
}

function isoDate(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

export function CommercialPanel({
  vehicle,
  commercial,
  onChange,
}: {
  vehicle: Vehicle;
  commercial: VehicleCommercial;
  onChange: (commercial: VehicleCommercial) => void;
}) {
  const summary = vehicleCommercialSummary({ ...vehicle, commercial });
  const latestPrice = commercial.priceHistory.at(-1);
  const set = <K extends keyof VehicleCommercial>(key: K, value: VehicleCommercial[K]) => onChange({ ...commercial, [key]: value });

  return <section className="panel">
    <div className="panelHeader">
      <div><p className="eyebrow">Commercieel dossier</p><h2>Voorraadprestatie</h2></div>
      <strong className={summary.marginOnTarget ? "marginGood" : "marginWarn"}>{summary.stockDays} dagen voorraad</strong>
    </div>
    <div className="formGrid compact">
      <label>Inkoopbron<input value={commercial.acquisitionSource ?? ""} placeholder="Inruil, veiling, leverancier…" onChange={event => set("acquisitionSource", event.target.value)} /></label>
      <label>Ingekocht op<input type="date" value={dateValue(commercial.acquiredAt)} onChange={event => set("acquiredAt", isoDate(event.target.value))} /></label>
      <label>In voorraad sinds<input type="date" value={dateValue(commercial.stockEnteredAt)} onChange={event => set("stockEnteredAt", isoDate(event.target.value))} /></label>
      <label>Maximale statijd<input type="number" min="0" step="1" value={commercial.maxStockDays} onChange={event => set("maxStockDays", Number(event.target.value))} /></label>
      <label>Doelmarge<input type="number" min="0" step="0.01" value={centsToEuros(commercial.targetMarginCents)} onChange={event => set("targetMarginCents", eurosToCents(Number(event.target.value), "targetMarginCents"))} /></label>
      <label>Websiteweergaven<input type="number" min="0" step="1" value={commercial.viewCount} onChange={event => set("viewCount", Number(event.target.value))} /></label>
      <label>Leads<input type="number" min="0" step="1" value={commercial.leadCount} onChange={event => set("leadCount", Number(event.target.value))} /></label>
      <label>Definitieve verkoopprijs<input value={commercial.soldPriceCents === undefined ? "" : centsToEuros(commercial.soldPriceCents)} readOnly /></label>
    </div>
    <div className="marginSummary">
      <span>Verwachte/definitieve marge <strong>{summary.costsKnown ? eur.format(centsToEuros(summary.marginCents)) : "Vul eerst de inkoopprijs in"}</strong></span>
      <span>Doelmarge <strong>{eur.format(centsToEuros(summary.targetMarginCents))}</strong></span>
      <span>Prijswijzigingen <strong>{commercial.priceHistory.length}</strong></span>
      <span>Laatste geregistreerde prijs <strong>{latestPrice ? eur.format(centsToEuros(latestPrice.priceCents)) : "Nog niet geregistreerd"}</strong></span>
    </div>
  </section>;
}
