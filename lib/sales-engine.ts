import type { Lead, LeadTemperature, Quote, QuoteLine } from "@/types";

export function scoreLead(lead: Lead): { score: number; temperature: LeadTemperature; reasons: string[] } {
  let score = 10;
  const reasons: string[] = [];
  if (lead.phone) { score += 15; reasons.push("Telefoonnummer beschikbaar"); }
  if (lead.email) { score += 8; reasons.push("E-mailadres beschikbaar"); }
  if (lead.vehicleId) { score += 15; reasons.push("Interesse in specifieke auto"); }
  if (lead.channel === "merchant") { score += 12; reasons.push("Google Vehicle Ads-intentie"); }
  if (lead.channel === "whatsapp") { score += 10; reasons.push("Direct contactkanaal"); }
  if (lead.hasTradeIn) { score += 12; reasons.push("Inruilauto aanwezig"); }
  if (lead.financingNeeded) { score += 8; reasons.push("Financieringsbehoefte"); }
  if ((lead.budgetEur ?? 0) >= 20000) { score += 8; reasons.push("Budget past bij kernvoorraad"); }
  const message = (lead.message ?? "").toLowerCase();
  if (/proefrit|vandaag|morgen|kopen|beschikbaar/.test(message)) { score += 18; reasons.push("Hoge koopintentie in bericht"); }
  if (!lead.consent) { score -= 25; reasons.push("Geen marketingtoestemming"); }
  score = Math.max(0, Math.min(100, score));
  const temperature: LeadTemperature = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
  return { score, temperature, reasons };
}

export function responseDeadline(score: number, createdAt = new Date()): string {
  const minutes = score >= 70 ? 10 : score >= 40 ? 30 : 120;
  return new Date(createdAt.getTime() + minutes * 60_000).toISOString();
}

export function quoteTotals(lines: QuoteLine[], discountEur = 0, tradeInCreditEur = 0) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceEur, 0);
  const total = Math.max(0, subtotal - discountEur - tradeInCreditEur);
  return { subtotal, total };
}

export function createQuoteId() {
  return `OFF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function defaultQuoteLines(vehiclePrice = 0): Quote["lines"] {
  return [
    { label: "Voertuig", quantity: 1, unitPriceEur: vehiclePrice, vatPercent: 0 },
    { label: "Volt & Vroom afleverpakket", quantity: 1, unitPriceEur: 995, vatPercent: 21 },
  ];
}
