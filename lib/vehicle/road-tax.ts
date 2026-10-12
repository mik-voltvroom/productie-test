import type { VehicleRoadTax } from "@/types";

function validRange(min: unknown, max: unknown): boolean {
  return Number.isSafeInteger(min) && Number.isSafeInteger(max) && (min as number) >= 0 && (max as number) >= (min as number);
}

/** Old modern-field imports may contain a monthly minimum labelled as quarterly. */
export function usableRoadTax(tax: VehicleRoadTax | undefined): VehicleRoadTax | undefined {
  if (!tax || !validRange(tax.quarterlyMinCents, tax.quarterlyMaxCents)) return undefined;
  if (tax.source === "mobilox-hexon" && tax.sourceField !== "wegenbelasting_kwartaal" && tax.schemaVersion !== 2) return undefined;
  return tax;
}

export function hasMonthlyRoadTax(tax: VehicleRoadTax): boolean {
  return validRange(tax.monthlyMinCents, tax.monthlyMaxCents);
}

export function roadTaxSourceLabel(value: VehicleRoadTax | undefined): string {
  const tax = usableRoadTax(value);
  if (!tax) return "Wegenbelasting niet aangeleverd of nog niet opnieuw ingelezen.";
  if (tax.source === "manual") return "Wegenbelasting: handmatig ingevoerd kwartaalbedrag, omgerekend naar maandbedrag.";
  return hasMonthlyRoadTax(tax)
    ? "Wegenbelasting: maandbedragen aangeleverd door Mobilox / Hexon."
    : "Wegenbelasting: bron Mobilox / Hexon, omgerekend van kwartaal- naar maandbedrag.";
}
