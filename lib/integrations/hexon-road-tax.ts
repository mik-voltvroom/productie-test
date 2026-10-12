import type { VehicleRoadTax } from "@/types";

type Fields = Record<string, unknown>;
const record = (value: unknown): value is Fields => !!value && typeof value === "object" && !Array.isArray(value);

/** Direct children only: never mistake another period, metadata or an attribute for money. */
function field(node: unknown, name: string): unknown {
  if (!record(node)) return undefined;
  const entries = Object.entries(node).filter(([key]) => !key.startsWith("@_") && key.split(":").at(-1)?.toLowerCase() === name);
  return entries.length === 1 ? entries[0][1] : undefined;
}

function cents(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const raw = String(value).trim();
  if (!raw || !/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return undefined;
  const amount = Math.round(Number(raw.replace(",", ".")) * 100);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : undefined;
}

/** Hexon v2.25: each period endpoint is a `prijzen` collection of `prijs` records. */
function periodAmount(node: unknown, name: string): number | undefined {
  const prices = field(field(node, name), "prijs");
  const entries = Array.isArray(prices) ? prices : [prices];
  const euroPrices = entries.filter(price => field(price, "munteenheid") === "EUR");
  // Never choose an arbitrary price if multiple EUR amounts are supplied.
  return euroPrices.length === 1 ? cents(field(euroPrices[0], "bedrag")) : undefined;
}

function validRange(min: number | undefined, max: number | undefined): boolean {
  return min !== undefined && max !== undefined && min <= max;
}

/** Source: https://eigenwebsite.dv.nl/docs/2.25/voertuig.xsd */
export function parseHexonRoadTax(vehicle: unknown): VehicleRoadTax | undefined {
  const modern = field(vehicle, "motorrijtuigen_belasting");
  if (modern !== undefined && modern !== "") {
    const min = periodAmount(modern, "kwartaal_min");
    const max = periodAmount(modern, "kwartaal_max");
    if (!validRange(min, max)) return undefined;
    const monthMin = periodAmount(modern, "maand_min");
    const monthMax = periodAmount(modern, "maand_max");
    return {
      quarterlyMinCents: min!, quarterlyMaxCents: max!,
      ...(validRange(monthMin, monthMax) ? { monthlyMinCents: monthMin!, monthlyMaxCents: monthMax! } : {}),
      source: "mobilox-hexon", sourceField: "motorrijtuigen_belasting", schemaVersion: 2,
    };
  }
  const legacy = field(vehicle, "wegenbelasting_kwartaal");
  const scalar = cents(legacy);
  const min = scalar ?? cents(field(legacy, "min"));
  const max = scalar ?? cents(field(legacy, "max"));
  if (!validRange(min, max)) return undefined;
  return { quarterlyMinCents: min!, quarterlyMaxCents: max!, source: "mobilox-hexon", sourceField: "wegenbelasting_kwartaal" };
}
