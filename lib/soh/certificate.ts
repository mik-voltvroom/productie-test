import { z } from "zod";

export const vehicleSohSnapshotSchema = z.object({
  brand: z.string().trim().min(1).max(120), model: z.string().trim().min(1).max(180),
  trim: z.string().max(250), year: z.number().int().min(1886).max(2200),
  mileageKm: z.number().int().nonnegative(), licensePlate: z.string().max(30).nullable(),
  vin: z.string().max(40).nullable(), photoUrl: z.string().url().max(2000).nullable(),
  battery: z.array(z.object({ label: z.string().max(80), value: z.string().max(150) }).strict()).max(12),
  sourceUpdatedAt: z.string().min(1).max(80),
}).strict();
export const sohMeasurementSchema = z.object({
  sohPercent: z.number().finite().min(0).max(100), method: z.string().trim().min(1).max(120),
  measuredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Ongeldige meetdatum"),
}).strict();
export const sohSaveSchema = sohMeasurementSchema.extend({
  expectedVehicleUpdatedAt: z.string().min(1).max(80), expectedRevision: z.number().int().nonnegative(),
}).strict();
export const sohCertificateSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), vehicleId: z.string().min(1).max(120),
  measuredAt: sohMeasurementSchema.shape.measuredAt,
  sohPercent: sohMeasurementSchema.shape.sohPercent, method: sohMeasurementSchema.shape.method,
  verifiedBy: z.string().min(1).max(128), verifiedAt: z.string().datetime(),
  status: z.literal("verified"), vehicle: vehicleSohSnapshotSchema,
}).strict();
export type SohCertificate = z.infer<typeof sohCertificateSchema>;
export type SohSaveInput = z.infer<typeof sohSaveSchema>;
export type SohVehicleSnapshot = z.infer<typeof vehicleSohSnapshotSchema>;
export const sohHistoryPointSchema = z.object({ id:z.string().uuid(), measuredAt:sohMeasurementSchema.shape.measuredAt,
  verifiedAt:z.string().datetime(), sohPercent:sohMeasurementSchema.shape.sohPercent, method:sohMeasurementSchema.shape.method }).strict();
export type SohHistoryPoint = z.infer<typeof sohHistoryPointSchema>;
export type SohReportState = { report: SohCertificate | null; revision: number; history?: SohHistoryPoint[]; historyUnavailable?: boolean };
export function validateSohCertificate(input: unknown): SohCertificate { return sohCertificateSchema.parse(input); }
