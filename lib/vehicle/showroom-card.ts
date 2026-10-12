import type { VehicleRoadTax } from "@/types";
import { hasMonthlyRoadTax, usableRoadTax } from "./road-tax";

const wholeEuro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function showroomAdvertisementUrl(slug: string, baseUrl = "https://www.voltvroom.nl"): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/voorraad/${encodeURIComponent(slug)}`;
}

export function monthlyRoadTaxLabel(value: VehicleRoadTax | undefined): string {
  const roadTax = usableRoadTax(value);
  if (!roadTax) return "Niet opgegeven";
  const supplied = hasMonthlyRoadTax(roadTax);
  const minimum = supplied ? roadTax.monthlyMinCents! : Math.round(roadTax.quarterlyMinCents / 3);
  const maximum = supplied ? roadTax.monthlyMaxCents! : Math.round(roadTax.quarterlyMaxCents / 3);
  const format = supplied ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }) : wholeEuro;
  if (minimum === maximum) return `${format.format(minimum / 100)} p/m`;
  return `${format.format(minimum / 100)}–${format.format(maximum / 100).replace("€ ", "")} p/m`;
}

export function driveTypeLabel(driveType: string): string {
  if (driveType === "electric") return "Elektrisch";
  if (driveType === "plug-in-hybrid") return "Plug-in hybride";
  if (driveType === "full-hybrid") return "Hybride";
  return "Icons";
}

