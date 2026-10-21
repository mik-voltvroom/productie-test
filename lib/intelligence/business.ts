import type { Lead, Vehicle } from "@/types";
import { isPublishedOnWebsite } from "@/lib/vehicle/publication";
import { grossMargin } from "@/lib/business";

export function amsterdamDay(value: string | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function stockDays(vehicle: Vehicle, now: Date): number | null {
  const date = vehicle.commercial?.stockEnteredAt || vehicle.commercial?.acquiredAt;
  const start = date ? amsterdamDay(date) : null;
  const end = amsterdamDay(now);
  if (!start || !end || start > end) return null;
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
}
export function morningSnapshot(vehicles: Vehicle[], leads: (Lead & { lastContactAt?: string })[], now = new Date()) {
  const stock = vehicles.filter(vehicle => vehicle.status === "available");
  const knownCosts = stock.filter(vehicle => vehicle.costs && vehicle.costs.purchasePriceCents > 0);
  const open = leads.filter(lead => !["won", "lost"].includes(lead.status || "new"));
  const due = (lead: typeof open[number]) => {
    // An explicit next action remains due even after a previous contact.
    const deadline = lead.nextActionAt || (!lead.lastContactAt ? lead.sales?.responseDueAt : undefined);
    return deadline && Number.isFinite(Date.parse(deadline)) ? Date.parse(deadline) : null;
  };
  const overdue = open.filter(lead => due(lead) !== null && due(lead)! < now.getTime())
    .sort((a, b) => due(a)! - due(b)!);
  return {
    source: "VVOS voertuigen en leads", generatedAt: now.toISOString(), timeZone: "Europe/Amsterdam",
    available: stock.length, published: vehicles.filter(isPublishedOnWebsite).length,
    retailValueCents: stock.reduce((total, vehicle) => total + vehicle.priceCents, 0),
    expectedMarginCents: knownCosts.length === stock.length && stock.length > 0
      ? knownCosts.reduce((total, vehicle) => total + grossMargin(vehicle.priceCents, vehicle.costs!), 0) : null,
    missingCosts: stock.length - knownCosts.length,
    // Cost entry is not evidence that every invoice or future cost has been received.
    marginBasis: "Scenario op ingevoerde kosten; volledigheid kosten en gerealiseerd resultaat niet vastgesteld.",
    aged: stock.filter(vehicle => (stockDays(vehicle, now) ?? -1) >= 60).length,
    unknownAge: stock.filter(vehicle => stockDays(vehicle, now) === null).length,
    overdue: overdue.map(lead => ({ id: lead.id, dueAt: new Date(due(lead)!).toISOString() })),
    withoutOwner: open.filter(lead => !lead.owner).length,
    unknownDeadline: open.filter(lead => due(lead) === null).length,
  };
}
