import { z } from "zod";
import type { DriveType } from "@/types";
export const sections = ["identity", "body", "interior", "mechanics", "brakes", "tyres", "history", "battery", "charging"] as const;
export const sectionLabels: Record<typeof sections[number], string> = { identity: "Identiteit", body: "Carrosserie", interior: "Interieur", mechanics: "Techniek en diagnose", brakes: "Remmen", tyres: "Banden", history: "Historie", battery: "Accu / hybridesysteem", charging: "Laden" };
const finding = z.object({ section: z.enum(sections), result: z.enum(["unknown", "good", "attention", "critical", "not_applicable"]), note: z.string().trim().max(2000) }).strict();
export const measurementSchema = z.object({
  label: z.string().trim().min(1).max(100), value: z.number().finite(), unit: z.string().trim().min(1).max(30),
  measuredAt: z.string().datetime({ offset: true }), method: z.string().trim().min(1).max(200),
  sourceKind: z.enum(["measurement", "document", "manufacturer", "estimate"]),
  source: z.string().trim().min(1).max(300), evidenceId: z.string().uuid().optional(),
}).strict();
export const inspectionSchema = z.object({
  findings: z.array(finding).max(sections.length).refine(items => new Set(items.map(item => item.section)).size === items.length, "Dubbele sectie."),
  measurements: z.array(measurementSchema).max(50), evidenceIds: z.array(z.string().uuid()).max(50),
  publicSummary: z.string().trim().max(2000), publicationApproved: z.boolean(),
}).strict();
export const carCheckCommandSchema = z.object({
  expectedRevision: z.number().int().nonnegative(), expectedVehicleUpdatedAt: z.string().min(1).max(80),
  status: z.enum(["draft", "review", "released"]), inspection: inspectionSchema,
}).strict();
export type CarCheckCommand = z.infer<typeof carCheckCommandSchema>;
export type Inspection = z.infer<typeof inspectionSchema>;
export type CarCheckReport = { id: string; vehicleId: string; revision: number; status: CarCheckCommand["status"]; inspection: Inspection;
  inspectorUid: string; updatedAt: string; vehicleUpdatedAt: string; driveType: DriveType };
export class CarCheckError extends Error { constructor(message: string, public status: number) { super(message); } }
export function requiredSections(drive: DriveType) {
  return sections.filter(section => section !== "battery" && section !== "charging"
    || section === "battery" && drive !== "combustion"
    || section === "charging" && ["electric", "plug-in-hybrid"].includes(drive));
}
export function coverage(inspection: Inspection, drive: DriveType) {
  const required = requiredSections(drive);
  const checked = required.filter(section => inspection.findings.some(item => item.section === section && ["good", "attention", "critical"].includes(item.result))).length;
  return { checked, required: required.length, percent: Math.round(checked / required.length * 100) };
}
export function validateRelease(command: CarCheckCommand, previous: CarCheckReport | null, drive: DriveType) {
  if (command.status !== "released") return;
  if (previous?.status !== "review" || JSON.stringify(previous.inspection) !== JSON.stringify(command.inspection)) {
    throw new CarCheckError("Sla deze inhoud eerst op voor controle voordat u vrijgeeft.", 409);
  }
  if (coverage(command.inspection, drive).percent !== 100) throw new CarCheckError("Verplichte controles ontbreken. Onbekend telt niet als goed.", 400);
  if (!command.inspection.evidenceIds.length) throw new CarCheckError("Voeg inspectiebewijs toe voor vrijgave.", 400);
  if (command.inspection.measurements.some(item => ["measurement", "document"].includes(item.sourceKind) && !item.evidenceId)) {
    throw new CarCheckError("Een meting of documentclaim vereist een bewijsbestand.", 400);
  }
}
/** Only an explicit public summary leaves the internal dossier. No automatic
 * measurement publication, inspector identity, private notes or evidence links. */
export function publicCarCheck(report: CarCheckReport | null) {
  if (report?.status !== "released" || !report.inspection.publicationApproved || !report.inspection.publicSummary) return null;
  return { reportId: report.id, releasedAt: report.updatedAt, summary: report.inspection.publicSummary,
    coverage: coverage(report.inspection, report.driveType) };
}
