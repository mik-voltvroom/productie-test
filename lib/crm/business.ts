import { z } from "zod";
import { vehicleIdSchema } from "@/lib/contact/business";

const text = z.string().trim().max(2000);
const date = z.string().datetime({ offset: true });
export const leadUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "appointment", "won", "lost"]).optional(),
  owner: z.string().trim().max(128).optional(), nextActionAt: date.optional(),
  hasTradeIn: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Geen wijziging opgegeven.");

const base = { id: vehicleIdSchema, leadId: vehicleIdSchema };
export const crmSchemas = {
  leadActivities: z.object({ ...base, type: z.enum(["note", "call", "email", "whatsapp", "appointment", "quote", "trade_in", "status_change"]),
    summary: text.min(1), body: text.optional(), createdAt: date, createdBy: z.string().max(128).optional() }).strict(),
  appointments: z.object({ ...base, vehicleId: vehicleIdSchema.optional(), type: z.enum(["test_drive", "video_call", "showroom", "delivery"]),
    startAt: date, endAt: date, status: z.enum(["planned", "confirmed", "completed", "cancelled", "no_show"]),
    location: text.optional(), notes: text.optional() }).strict().refine(value => value.endAt > value.startAt, "Eind moet na start liggen."),
  // Existing CRM quotes use euros. Preserve that explicit legacy representation;
  // these drafts are not invoices and never change payment status.
  quotes: z.object({ ...base, vehicleId: vehicleIdSchema.optional(), status: z.literal("draft"),
    lines: z.array(z.object({ label: text.min(1), quantity: z.number().finite().positive(), unitPriceEur: z.number().finite().nonnegative(), vatPercent: z.number().min(0).max(100) }).strict()).min(1).max(100),
    discountEur: z.number().finite().nonnegative(), tradeInCreditEur: z.number().finite().nonnegative(),
    validUntil: date, notes: text.optional(), createdAt: date }).strict(),
  tradeIns: z.object({ ...base, licensePlate: z.string().max(30), mileageKm: z.number().int().nonnegative().optional(),
    brand: text.optional(), model: text.optional(), year: z.number().int().min(1886).max(2200).optional(), condition: text.optional(),
    expectedValueEur: z.number().finite().nonnegative().optional(), offeredValueEur: z.number().finite().nonnegative().optional(),
    status: z.enum(["requested", "review", "offered", "accepted", "rejected"]), photos: z.array(z.string().url().max(2000)).max(50), createdAt: date }).strict(),
};
export type CrmCollection = keyof typeof crmSchemas;

export class CrmError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
