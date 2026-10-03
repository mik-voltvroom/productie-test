import type { VehicleRoadTax } from "@/types";

const wholeEuro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function showroomAdvertisementUrl(slug: string, baseUrl = "https://www.voltvroom.nl"): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/voorraad/${encodeURIComponent(slug)}`;
}

export function monthlyRoadTaxLabel(roadTax: VehicleRoadTax | undefined): string {
  if (!roadTax) return "Niet opgegeven";
  const minimum = Math.round(roadTax.quarterlyMinCents / 3);
  const maximum = Math.round(roadTax.quarterlyMaxCents / 3);
  if (minimum === maximum) return `${wholeEuro.format(minimum / 100)} p/m`;
  return `${wholeEuro.format(minimum / 100)}–${wholeEuro.format(maximum / 100).replace("€ ", "")} p/m`;
}

export function driveTypeLabel(driveType: string): string {
  if (driveType === "electric") return "Elektrisch";
  if (driveType === "plug-in-hybrid") return "Plug-in hybride";
  if (driveType === "full-hybrid") return "Hybride";
  return "Icons";
}
