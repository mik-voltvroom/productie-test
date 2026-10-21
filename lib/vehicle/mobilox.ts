import type { HexonMutation } from "@/lib/integrations/hexon";
import type { Vehicle, VehicleImage } from "@/types";
import { mergeImportedEditorial } from "./editorial";
import { recordVehiclePrice } from "./business";
import { validateVehicle } from "@/lib/business";
import { buildVehicleLookup } from "@/lib/vehicle-lookup/business";

/** Full document replacement: only these internal fields survive a source refresh. */
export function buildMobiloxReplacement(current: Vehicle | undefined, incoming: Vehicle, photos: VehicleImage[], now: string, presence?: HexonMutation["contentPresence"]): Vehicle {
  if (current && presence) {
    const missing = [
      !presence.images && (current.images?.length || current.editorial?.photos.length) ? "foto’s" : null,
      !presence.description && (current.description || current.editorial?.content.websiteText) ? "advertentietekst" : null,
      !presence.highlights && current.highlights?.length ? "opties" : null,
    ].filter(Boolean);
    if (missing.length) throw new Error(`Onvolledige Mobilox-aanlevering (${missing.join(", ")}); bestaande voertuigdata behouden.`);
  }
  const next = mergeImportedEditorial(current, incoming, photos);
  const commercial = recordVehiclePrice(current?.commercial, incoming.priceCents, now, "mobilox-hexon");
  next.commercial = { ...commercial,
    acquisitionSource: commercial.acquisitionSource ?? "Mobilox / Hexon",
    stockEnteredAt: commercial.stockEnteredAt ?? current?.createdAt ?? now };
  next.createdAt = current?.createdAt ?? now;
  if (current?.costs !== undefined) next.costs = current.costs;
  if (current?.rangeOverrides !== undefined) next.rangeOverrides = current.rangeOverrides;
  // Accepted deals must not be made available again by a provider refresh.
  for (const key of ["reservedDealId", "reservedAt", "soldDealId", "soldAt"] as const) {
    if (current?.[key] !== undefined) next[key] = current[key];
  }
  if (current?.soldDealId) next.status = "sold";
  else if (current?.reservedDealId) next.status = "reserved";
  const errors = validateVehicle(next);
  if (next.status === "available" && errors.length) next.status = "review";
  next.publication = {
    channels: { website: incoming.status === "available" && errors.length === 0,
      merchant: current?.publication?.channels.merchant ?? false,
      google_ads: current?.publication?.channels.google_ads ?? false,
      meta: current?.publication?.channels.meta ?? false },
    completenessPercent: Math.max(0, 100 - errors.length * 12), lastValidatedAt: now, validationErrors: errors,
  };
  next.source = { contentVersion: 1, inventoryStatus: incoming.status, provider: "mobilox-hexon", externalId: incoming.id.replace(/^hexon-/, ""),
    lastMutationAt: now, imageStorage: next.images.length ? "mobilox" : "none", imageFailures: 0 };
  next.publicLookup = buildVehicleLookup(current, next);
  return next;
}
