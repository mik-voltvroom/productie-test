import { describe, expect, it } from "vitest";
import { carCheckCommandSchema, coverage, publicCarCheck, requiredSections, validateRelease, type Inspection, type CarCheckReport } from "@/lib/carcheck/business";
const evidence = "c176a593-b7f3-47d3-a093-41e7f1bd94df";
const inspection: Inspection = { findings: requiredSections("combustion").map(section => ({ section, result: "good", note: "Synthetische controle" })), measurements: [], evidenceIds: [evidence], publicSummary: "Synthetische samenvatting", publicationApproved: false };
const report: CarCheckReport = { id: evidence, vehicleId: "synthetic", revision: 1, status: "review", inspection, inspectorUid: "private", updatedAt: "2026-10-21T09:00:00Z", vehicleUpdatedAt: "2026-10-21T08:00:00Z", driveType: "combustion" };
describe("CarCheck release contract", () => {
  it("does not demand a traction battery/charging check for combustion Icons", () => {
    expect(coverage(inspection, "combustion").percent).toBe(100);
    expect(coverage(inspection, "electric").percent).toBeLessThan(100);
    expect(requiredSections("full-hybrid")).toContain("battery");
    expect(requiredSections("full-hybrid")).not.toContain("charging");
  });
  it("never counts missing or not-applicable mandatory checks as good", () => {
    expect(coverage({ ...inspection, findings: [] }, "electric").percent).toBe(0);
    expect(coverage({ ...inspection, findings: inspection.findings.map(item => ({ ...item, result: "not_applicable" })) }, "combustion").percent).toBe(0);
  });
  it("requires unchanged reviewed content and evidence for release", () => {
    const command = { expectedRevision: 1, expectedVehicleUpdatedAt: report.vehicleUpdatedAt, status: "released" as const, inspection };
    expect(() => validateRelease(command, report, "combustion")).not.toThrow();
    expect(() => validateRelease(command, null, "combustion")).toThrow();
    expect(() => validateRelease({ ...command, inspection: { ...inspection, publicSummary: "Changed" } }, report, "combustion")).toThrow();
    expect(() => validateRelease(command, report, "electric")).toThrow();
  });
  it("exposes only approved released public fields", () => {
    expect(publicCarCheck(report)).toBeNull();
    expect(publicCarCheck({ ...report, status: "released" })).toBeNull();
    const result = publicCarCheck({ ...report, status: "released", inspection: { ...inspection, publicationApproved: true } });
    expect(Object.keys(result!).sort()).toEqual(["coverage", "releasedAt", "reportId", "summary"]);
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("rejects incomplete measurement provenance", () => {
    expect(carCheckCommandSchema.safeParse({ expectedRevision: 0, expectedVehicleUpdatedAt: "now", status: "draft", inspection: { ...inspection, measurements: [{ value: 99 }] } }).success).toBe(false);
  });
});
