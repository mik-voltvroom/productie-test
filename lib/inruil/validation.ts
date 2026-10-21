import { z } from "zod";

export const MAX_TRADE_IN_PHOTOS = 6;
export const MAX_TRADE_IN_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_TRADE_IN_TOTAL_PHOTO_BYTES = 20 * 1024 * 1024;
export const ALLOWED_TRADE_IN_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function normalizeLicensePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const licensePlateSchema = z.string()
  .transform(normalizeLicensePlate)
  .pipe(z.string().regex(/^[A-Z0-9]{6,8}$/, "Vul een geldig Nederlands kenteken in."));

export const tradeInSubmissionSchema = z.object({
  licensePlate: licensePlateSchema,
  mileageKm: z.coerce.number().int().min(0).max(2_000_000),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  condition: z.enum(["excellent", "good", "used", "damage"]),
  maintenanceHistory: z.enum(["complete", "partial", "unknown"]),
  keys: z.enum(["one", "two", "more"]),
  options: z.string().trim().max(1000).optional(),
  damage: z.string().trim().max(1000).optional(),
  desiredVehicleId: z.string().trim().max(120).optional(),
  desiredVehicleLabel: z.string().trim().max(200).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(8).max(40).optional().or(z.literal("")),
  contactPreference: z.enum(["phone", "email", "whatsapp"]),
  consent: z.literal("on"),
  website: z.string().max(0).optional(),
}).refine(data => data.email || data.phone, {
  message: "Vul een telefoonnummer of e-mailadres in.",
  path: ["phone"],
}).refine(data => data.condition !== "damage" || Boolean(data.damage), {
  message: "Beschrijf kort welke schade aanwezig is.",
  path: ["damage"],
});

export type TradeInSubmission = z.infer<typeof tradeInSubmissionSchema>;
