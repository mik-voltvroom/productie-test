import { z } from "zod";
import type { Vehicle } from "@/types";
import { defaultVehicleCommercial } from "./business";

const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const date = z.string().datetime().nullable();
export const internalVehicleSchema = z.object({
  expectedUpdatedAt: z.string().min(1),
  costs: z.object({ purchasePriceCents: cents, transportCents: cents, preparationCents: cents,
    maintenanceCents: cents, warrantyReserveCents: cents, advertisingCents: cents,
    financingCents: cents, otherCents: cents }).strict(),
  commercial: z.object({ acquisitionSource: z.string().max(300).optional(), acquiredAt: date,
    stockEnteredAt: date, targetMarginCents: cents, maxStockDays: cents,
    viewCount: cents, leadCount: cents }).strict(),
}).strict();
export type InternalVehicleInput = z.infer<typeof internalVehicleSchema>;
export class VehicleEditConflict extends Error {}

export function applyInternalVehicleUpdate(current: Vehicle, input: InternalVehicleInput, now: string): Vehicle {
  const parsed = internalVehicleSchema.parse(input);
  if (parsed.expectedUpdatedAt !== current.updatedAt) throw new VehicleEditConflict("Het voertuig is tussentijds gewijzigd. Herlaad het dossier.");
  const { acquiredAt, stockEnteredAt, ...editable } = parsed.commercial;
  const commercial = { ...(current.commercial ?? { ...defaultVehicleCommercial, priceHistory: [] }), ...editable };
  if (acquiredAt === null) delete commercial.acquiredAt; else commercial.acquiredAt = acquiredAt;
  if (stockEnteredAt === null) delete commercial.stockEnteredAt; else commercial.stockEnteredAt = stockEnteredAt;
  return { ...current, costs: parsed.costs, commercial, updatedAt: now };
}
