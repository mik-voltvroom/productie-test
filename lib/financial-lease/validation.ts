import { z } from "zod";
import { leaseSelectionSchema } from "./business";

export const financialLeaseFields = z.object({
  expectedAnnualRateBps: z.number().int().min(0).max(3000),
  expectedPriceCents: z.number().int().positive().max(100_000_000),
  type: z.literal("financial_lease"),
  vehicleId: z.string().min(1).max(160).regex(/^[^/]+$/),
  companyName: z.string().trim().min(2).max(160),
  kvk: z.string().regex(/^\d{8}$/),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(40).regex(/^[+\d\s().-]+$/),
  email: z.string().trim().email().max(254),
  consent: z.literal(true),
  leaseSelection: leaseSelectionSchema,
});
