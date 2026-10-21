import type { Vehicle, VehicleCosts } from "@/types";
import { assertEurocents, eurosToCents } from "@/lib/money";
import { defaultVehicleCommercial, normalizeVehicleCommercial, recordVehiclePrice } from "@/lib/vehicle/business";

const topLevelMoneyFields = [
  ["priceCents", "priceEur", true],
  ["monthlyPriceCents", "monthlyPriceEur", false],
  ["annualSavingCents", "annualSavingEur", false],
] as const;

const costMoneyFields = [
  ["purchasePriceCents", "purchasePriceEur"],
  ["transportCents", "transportEur"],
  ["preparationCents", "preparationEur"],
  ["maintenanceCents", "maintenanceEur"],
  ["warrantyReserveCents", "warrantyReserveEur"],
  ["advertisingCents", "advertisingEur"],
  ["financingCents", "financingEur"],
  ["otherCents", "otherEur"],
] as const;

function normalizeMoneyField(
  record: Record<string, unknown>,
  centsField: string,
  legacyEuroField: string,
  required: boolean,
): number | undefined {
  const cents = record[centsField];
  const euros = record[legacyEuroField];
  if (typeof cents === "number") {
    const normalized = assertEurocents(cents, centsField);
    if (typeof euros === "number" && normalized !== eurosToCents(euros, legacyEuroField)) {
      throw new Error(`Conflicterende geldvelden ${centsField} en ${legacyEuroField}.`);
    }
    return normalized;
  }
  if (typeof euros === "number") return eurosToCents(euros, legacyEuroField);
  if (required) throw new Error(`Financieel veld ${centsField} ontbreekt.`);
  return undefined;
}

function normalizeCosts(value: unknown): VehicleCosts | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new Error("Voertuigkosten hebben een ongeldig formaat.");
  const source = value as Record<string, unknown>;
  const normalized: Record<string, number> = {};
  for (const [centsField, euroField] of costMoneyFields) {
    normalized[centsField] = normalizeMoneyField(source, centsField, euroField, true) as number;
  }
  return normalized as unknown as VehicleCosts;
}

export function normalizeVehicleDocument(id: string, value: Record<string, unknown>): Vehicle {
  const normalized: Record<string, unknown> = { ...value, id };
  for (const [centsField, euroField, required] of topLevelMoneyFields) {
    const cents = normalizeMoneyField(normalized, centsField, euroField, required);
    if (cents !== undefined) normalized[centsField] = cents;
    else delete normalized[centsField];
    delete normalized[euroField];
  }
  normalized.costs = normalizeCosts(normalized.costs);
  if (normalized.costs === undefined) delete normalized.costs;
  normalized.commercial = normalizeVehicleCommercial(normalized.commercial);
  if (normalized.commercial === undefined) {
    const source = normalized.source && typeof normalized.source === "object"
      ? normalized.source as Record<string, unknown>
      : undefined;
    const provider = typeof source?.provider === "string" ? source.provider : undefined;
    const effectiveAt = typeof normalized.updatedAt === "string"
      ? normalized.updatedAt
      : typeof normalized.createdAt === "string"
        ? normalized.createdAt
        : "1970-01-01T00:00:00.000Z";
    normalized.commercial = recordVehiclePrice({
      ...defaultVehicleCommercial,
      priceHistory: [],
      ...(provider ? { acquisitionSource: provider === "mobilox-hexon" ? "Mobilox / Hexon" : provider } : {}),
      stockEnteredAt: typeof normalized.createdAt === "string" ? normalized.createdAt : effectiveAt,
    }, normalized.priceCents as number, effectiveAt, "migration");
  }
  return normalized as unknown as Vehicle;
}

export const legacyVehicleMoneyPaths = [
  ...topLevelMoneyFields.map(([, euroField]) => euroField),
  ...costMoneyFields.map(([, euroField]) => `costs.${euroField}`),
] as const;

export interface VehicleMoneyMigrationPlan {
  id: string;
  status: "migrate" | "noop";
  set: Record<string, number>;
  deletePaths: string[];
  rollback: { set: Record<string, number>; deletePaths: string[] };
}

export function planVehicleMoneyMigration(id: string, value: Record<string, unknown>): VehicleMoneyMigrationPlan {
  const normalized = normalizeVehicleDocument(id, value) as unknown as Record<string, unknown>;
  const set: Record<string, number> = {};
  const rollbackSet: Record<string, number> = {};
  const deletePaths: string[] = [];
  const rollbackDeletePaths: string[] = [];

  for (const [centsField, euroField] of topLevelMoneyFields) {
    if (typeof value[euroField] === "number") {
      set[centsField] = normalized[centsField] as number;
      rollbackSet[euroField] = value[euroField] as number;
      deletePaths.push(euroField);
      if (typeof value[centsField] !== "number") rollbackDeletePaths.push(centsField);
    }
  }

  const sourceCosts = value.costs && typeof value.costs === "object" ? value.costs as Record<string, unknown> : {};
  const normalizedCosts = normalized.costs as Record<string, number> | undefined;
  for (const [centsField, euroField] of costMoneyFields) {
    if (typeof sourceCosts[euroField] === "number" && normalizedCosts) {
      set[`costs.${centsField}`] = normalizedCosts[centsField];
      rollbackSet[`costs.${euroField}`] = sourceCosts[euroField] as number;
      deletePaths.push(`costs.${euroField}`);
      if (typeof sourceCosts[centsField] !== "number") rollbackDeletePaths.push(`costs.${centsField}`);
    }
  }

  return {
    id,
    status: deletePaths.length ? "migrate" : "noop",
    set,
    deletePaths,
    rollback: { set: rollbackSet, deletePaths: rollbackDeletePaths },
  };
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const [head, tail] = path.split(".", 2);
  if (!tail) {
    target[head] = value;
    return;
  }
  const nested = target[head] && typeof target[head] === "object"
    ? { ...(target[head] as Record<string, unknown>) }
    : {};
  nested[tail] = value;
  target[head] = nested;
}

function deletePath(target: Record<string, unknown>, path: string): void {
  const [head, tail] = path.split(".", 2);
  if (!tail) {
    delete target[head];
    return;
  }
  if (!target[head] || typeof target[head] !== "object") return;
  const nested = { ...(target[head] as Record<string, unknown>) };
  delete nested[tail];
  target[head] = nested;
}

export function applyVehicleMoneyPatch(
  value: Record<string, unknown>,
  patch: { set: Record<string, number>; deletePaths: string[] },
): Record<string, unknown> {
  const result = { ...value };
  for (const [path, amount] of Object.entries(patch.set)) setPath(result, path, amount);
  for (const path of patch.deletePaths) deletePath(result, path);
  return result;
}
