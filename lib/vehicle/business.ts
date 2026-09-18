import type {
  Vehicle,
  VehicleCommercial,
  VehicleCosts,
  VehiclePriceChangeSource,
  VehiclePriceHistoryEntry,
} from "@/types";
import { assertEurocents } from "@/lib/money";
import { emptyCosts, grossMargin } from "@/lib/business";

export const defaultVehicleCommercial: VehicleCommercial = {
  targetMarginCents: 300_000,
  maxStockDays: 45,
  viewCount: 0,
  leadCount: 0,
  priceHistory: [],
};

export function isIconVehicle(vehicle: Pick<Vehicle, "collection">): boolean {
  return vehicle.collection === "icons";
}

function nonNegativeInteger(value: unknown, field: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Commercieel veld ${field} is ongeldig.`);
  }
  return value;
}

function optionalIsoDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`Commercieel veld ${field} is geen geldige datum.`);
  }
  return value;
}

function eurocents(value: unknown, field: string): number {
  if (typeof value !== "number") throw new Error(`${field} moet een bedrag in eurocenten zijn.`);
  return assertEurocents(value, field);
}

function normalizePriceHistory(value: unknown): VehiclePriceHistoryEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Prijsverloop heeft een ongeldig formaat.");
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`Prijsverloopregel ${index + 1} is ongeldig.`);
    const source = entry as Record<string, unknown>;
    const effectiveAt = optionalIsoDate(source.effectiveAt, `priceHistory.${index}.effectiveAt`);
    if (!effectiveAt) throw new Error(`Prijsverloopregel ${index + 1} mist een datum.`);
    const allowedSources: VehiclePriceChangeSource[] = ["mobilox-hexon", "manual", "deal", "migration"];
    if (typeof source.source !== "string" || !allowedSources.includes(source.source as VehiclePriceChangeSource)) {
      throw new Error(`Prijsverloopregel ${index + 1} heeft een ongeldige bron.`);
    }
    return {
      priceCents: eurocents(source.priceCents, `priceHistory.${index}.priceCents`),
      effectiveAt,
      source: source.source as VehiclePriceChangeSource,
    };
  }).slice(-100);
}

export function normalizeVehicleCommercial(value: unknown): VehicleCommercial | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new Error("Commercieel voertuigdossier heeft een ongeldig formaat.");
  const source = value as Record<string, unknown>;
  const acquisitionSource = typeof source.acquisitionSource === "string" && source.acquisitionSource.trim()
    ? source.acquisitionSource.trim().slice(0, 120)
    : undefined;
  const soldPriceCents = source.soldPriceCents === undefined
    ? undefined
    : eurocents(source.soldPriceCents, "commercial.soldPriceCents");
  return {
    ...defaultVehicleCommercial,
    ...(acquisitionSource ? { acquisitionSource } : {}),
    ...(optionalIsoDate(source.acquiredAt, "commercial.acquiredAt") ? { acquiredAt: source.acquiredAt as string } : {}),
    ...(optionalIsoDate(source.stockEnteredAt, "commercial.stockEnteredAt") ? { stockEnteredAt: source.stockEnteredAt as string } : {}),
    targetMarginCents: eurocents(source.targetMarginCents ?? defaultVehicleCommercial.targetMarginCents, "commercial.targetMarginCents"),
    maxStockDays: nonNegativeInteger(source.maxStockDays, "commercial.maxStockDays", defaultVehicleCommercial.maxStockDays),
    viewCount: nonNegativeInteger(source.viewCount, "commercial.viewCount", 0),
    leadCount: nonNegativeInteger(source.leadCount, "commercial.leadCount", 0),
    priceHistory: normalizePriceHistory(source.priceHistory),
    ...(soldPriceCents !== undefined ? { soldPriceCents } : {}),
  };
}

export function recordVehiclePrice(
  commercial: VehicleCommercial | undefined,
  priceCents: number,
  effectiveAt: string,
  source: VehiclePriceChangeSource,
): VehicleCommercial {
  const normalized = normalizeVehicleCommercial(commercial ?? defaultVehicleCommercial) ?? { ...defaultVehicleCommercial };
  const normalizedPrice = assertEurocents(priceCents, "priceCents");
  const latest = normalized.priceHistory.at(-1);
  if (latest?.priceCents === normalizedPrice) return normalized;
  return {
    ...normalized,
    priceHistory: [...normalized.priceHistory, { priceCents: normalizedPrice, effectiveAt, source }].slice(-100),
  };
}

export interface VehicleCommercialSummary {
  stockDays: number;
  totalLeadCount: number;
  totalViewCount: number;
  marginCents: number;
  targetMarginCents: number;
  costsKnown: boolean;
  marginOnTarget: boolean;
}

export function vehicleCommercialSummary(vehicle: Pick<Vehicle, "commercial" | "costs" | "priceCents" | "createdAt" | "soldAt">, now = new Date()): VehicleCommercialSummary {
  const commercial = normalizeVehicleCommercial(vehicle.commercial ?? defaultVehicleCommercial) ?? defaultVehicleCommercial;
  const startValue = commercial.stockEnteredAt ?? commercial.acquiredAt ?? vehicle.createdAt;
  const endValue = vehicle.soldAt ?? now.toISOString();
  const start = startValue ? new Date(startValue).getTime() : now.getTime();
  const end = new Date(endValue).getTime();
  const stockDays = Math.max(0, Math.floor((end - start) / 86_400_000));
  const revenueCents = commercial.soldPriceCents ?? vehicle.priceCents;
  const costs: VehicleCosts = vehicle.costs ?? emptyCosts;
  const costsKnown = Boolean(vehicle.costs && costs.purchasePriceCents > 0);
  const marginCents = grossMargin(revenueCents, costs);
  return {
    stockDays,
    totalLeadCount: commercial.leadCount,
    totalViewCount: commercial.viewCount,
    marginCents,
    targetMarginCents: commercial.targetMarginCents,
    costsKnown,
    marginOnTarget: costsKnown && marginCents >= commercial.targetMarginCents,
  };
}
