"use client";
import type { VehicleCosts } from "@/types";
import { eur } from "@/lib/format";
import { grossMargin, marginPercent, totalCosts } from "@/lib/business";
import { centsToEuros, eurosToCents } from "@/lib/money";

export function MarginPanel({ priceCents, costs, targetMarginCents = 300_000, onChange }: { priceCents: number; costs: VehicleCosts; targetMarginCents?: number; onChange: (costs: VehicleCosts) => void }) {
  const labels: Record<keyof VehicleCosts, string> = {
    purchasePriceCents: "Inkoopprijs", transportCents: "Transport", preparationCents: "Poetsen/foto", maintenanceCents: "Onderhoud", warrantyReserveCents: "Garantiereserve", advertisingCents: "Advertentie", financingCents: "Voorraadfinanciering", otherCents: "Overig"
  };
  return <section className="panel">
    <div className="panelHeader"><div><p className="eyebrow">Dealcalculatie</p><h2>Marge vóór overhead</h2></div><strong className={costs.purchasePriceCents > 0 && grossMargin(priceCents, costs) >= targetMarginCents ? "marginGood" : "marginWarn"}>{costs.purchasePriceCents > 0 ? eur.format(centsToEuros(grossMargin(priceCents, costs))) : "Inkoopprijs ontbreekt"}</strong></div>
    <div className="formGrid compact">
      {(Object.keys(labels) as (keyof VehicleCosts)[]).map(key => <label key={key}>{labels[key]}<input type="number" min="0" step="0.01" value={centsToEuros(costs[key])} onChange={e => onChange({ ...costs, [key]: eurosToCents(Number(e.target.value), key) })} /></label>)}
    </div>
    <div className="marginSummary"><span>Totale directe kostprijs <strong>{eur.format(centsToEuros(totalCosts(costs)))}</strong></span><span>Margepercentage <strong>{costs.purchasePriceCents > 0 ? `${marginPercent(priceCents, costs).toFixed(1)}%` : "–"}</strong></span><span>Doelmarge <strong>{eur.format(centsToEuros(targetMarginCents))}</strong></span></div>
  </section>;
}
