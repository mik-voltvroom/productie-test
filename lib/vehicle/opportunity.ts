import type { Vehicle } from "@/types";
import { vehicleCommercialSummary } from "@/lib/vehicle/business";

export type OpportunityAdvice = "STRONG_BUY" | "BUY" | "WATCH" | "PASS";

export interface OpportunityInputs {
  expectedMarginCents?: number;
  marketPricePositionPercent?: number;
  expectedStockDays?: number;
  comparableSupplyCount?: number;
  technicalRiskScore?: number;
}

export interface OpportunityFactor {
  key: "margin" | "market" | "velocity" | "supply" | "technical";
  label: string;
  score: number;
  weight: number;
  reason: string;
}

export interface OpportunityResult {
  score: number;
  advice: OpportunityAdvice;
  factors: OpportunityFactor[];
  missingInputs: string[];
  version: "v1";
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function advice(score: number): OpportunityAdvice {
  if (score >= 80) return "STRONG_BUY";
  if (score >= 65) return "BUY";
  if (score >= 50) return "WATCH";
  return "PASS";
}

export function calculateOpportunityScore(vehicle: Vehicle, input: OpportunityInputs = {}): OpportunityResult {
  const commercial = vehicleCommercialSummary(vehicle);
  const expectedMargin = input.expectedMarginCents ?? (commercial.costsKnown ? commercial.marginCents : undefined);
  const targetMargin = vehicle.commercial?.targetMarginCents ?? 300_000;
  const marginScore = expectedMargin === undefined ? 50 : clamp((expectedMargin / Math.max(1, targetMargin)) * 75);

  // Negative means cheaper than comparable market; positive means more expensive.
  const marketPosition = input.marketPricePositionPercent;
  const marketScore = marketPosition === undefined ? 50 : clamp(70 - marketPosition * 4);

  const expectedStockDays = input.expectedStockDays;
  const velocityScore = expectedStockDays === undefined ? 50 : clamp(100 - Math.max(0, expectedStockDays - 15) * 2.2);

  // Scarcity is rewarded, but never allowed to dominate the decision.
  const supply = input.comparableSupplyCount;
  const supplyScore = supply === undefined ? 50 : clamp(85 - Math.min(60, supply * 2));

  // 0 technical risk = excellent; 100 = unacceptable risk.
  const technicalRisk = input.technicalRiskScore;
  const technicalScore = technicalRisk === undefined ? 50 : clamp(100 - technicalRisk);

  const factors: OpportunityFactor[] = [
    { key: "margin", label: "Verwachte marge", score: marginScore, weight: 0.30, reason: expectedMargin === undefined ? "Nog geen betrouwbare kostprijs/marge" : `Verwachte marge €${Math.round(expectedMargin / 100).toLocaleString("nl-NL")}` },
    { key: "market", label: "Marktprijspositie", score: marketScore, weight: 0.20, reason: marketPosition === undefined ? "Marktvergelijking ontbreekt" : `${marketPosition > 0 ? "+" : ""}${marketPosition.toFixed(1)}% t.o.v. vergelijkbare markt` },
    { key: "velocity", label: "Verkoopsnelheid", score: velocityScore, weight: 0.20, reason: expectedStockDays === undefined ? "Verwachte statijd ontbreekt" : `${expectedStockDays} dagen verwachte statijd` },
    { key: "supply", label: "Beschikbaar aanbod", score: supplyScore, weight: 0.10, reason: supply === undefined ? "Concurrentievoorraad ontbreekt" : `${supply} vergelijkbare auto's` },
    { key: "technical", label: "Technisch risico", score: technicalScore, weight: 0.20, reason: technicalRisk === undefined ? "Technische risicoscore ontbreekt" : `Risico ${technicalRisk}/100` },
  ];

  const score = clamp(factors.reduce((total, factor) => total + factor.score * factor.weight, 0));
  const missingInputs = [
    expectedMargin === undefined ? "expectedMarginCents" : null,
    marketPosition === undefined ? "marketPricePositionPercent" : null,
    expectedStockDays === undefined ? "expectedStockDays" : null,
    supply === undefined ? "comparableSupplyCount" : null,
    technicalRisk === undefined ? "technicalRiskScore" : null,
  ].filter((value): value is string => Boolean(value));

  // Missing data is visible and deliberately neutral (50), never fabricated.
  return { score, advice: advice(score), factors, missingInputs, version: "v1" };
}
