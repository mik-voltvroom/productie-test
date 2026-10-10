import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSohCertificate, sohVehicleSnapshot } from "@/lib/soh/business";
import { sohSaveSchema, validateSohCertificate } from "@/lib/soh/certificate";
import { SohCertificate } from "@/components/soh/SohCertificate";
import { hasPermission } from "@/lib/auth/permissions";
import type { Vehicle } from "@/types";
import { sohPrintScale } from "@/lib/soh/print";
export const vehicle = { id:"car-1", brand:"Volvo", model:"XC60", trim:"T8", year:2021, mileageKm:82000,
  updatedAt:"2026-10-09T10:00:00.000Z", images:["https://example.test/first.jpg", "https://example.test/second.jpg"],
  licensePlate:"TEST-01", priceCents:3500000, batteryHealthPercent:88, chargingPowerKw:3.7,
  publication:{ channels:{ website:false }, publicImageUrls:[] } } as unknown as Vehicle;
export const input = { sohPercent:92.5, method:"Diagnosetest", measuredAt:"2026-10-10", expectedVehicleUpdatedAt:vehicle.updatedAt, expectedRevision:0 };
export const actor = { uid:"staff-1", email:null, role:"workshop" as const };
export const report = createSohCertificate(vehicle, input, actor, "12345678-1234-4234-8234-123456789012", "2026-10-10T12:00:00.000Z");
describe("Internal SOH certificate", () => {
  it("fits long source text on A4 without enlarging shorter certificates", () => {
    expect(sohPrintScale(900, 1000)).toBe(1); expect(sohPrintScale(1500, 1000)).toBeCloseTo(2 / 3);
    expect(() => sohPrintScale(0, 1000)).toThrow();
  });
  it("uses synchronized vehicle fields and the first internal photo, separately from measured SOH", () => {
    expect(report.vehicle).toMatchObject({ brand:"Volvo", model:"XC60", trim:"T8", year:2021, mileageKm:82000, photoUrl:vehicle.images[0] });
    expect(report.sohPercent).toBe(92.5); expect(report.vehicle.battery[0].value).toBe("88 %");
    expect(report.verifiedBy).toBe(actor.uid); expect(report.verifiedAt).toBe("2026-10-10T12:00:00.000Z");
    expect(vehicle.batteryHealthPercent).toBe(88); expect(vehicle.publication?.channels.website).toBe(false);
  });
  it("keeps the validated snapshot independent of future Mobilox updates", () => {
    const mutable = { ...vehicle, images:[...vehicle.images] };
    const certificate = createSohCertificate(mutable, input, actor, report.id, report.verifiedAt);
    mutable.mileageKm = 99000; mutable.images[0] = "https://example.test/new.jpg";
    expect(certificate.vehicle.mileageKm).toBe(82000); expect(certificate.vehicle.photoUrl).toBe(vehicle.images[0]);
  });
  it.each([-1, 101, NaN, Infinity])("rejects invalid SOH %s", sohPercent => {
    expect(sohSaveSchema.safeParse({ ...input, sohPercent }).success).toBe(false);
  });
  it.each(["", "2026-02-30", "2026-13-01", "10-10-2026"])("rejects invalid date %s", measuredAt => {
    expect(sohSaveSchema.safeParse({ ...input, measuredAt }).success).toBe(false);
  });
  it("rejects blank methods, injected source/validator data, future dates and stale vehicle data", () => {
    for (const extra of [{ method:" " }, { verifiedBy:"fake" }, { vehicle:{} }, { status:"verified" }])
      expect(sohSaveSchema.safeParse({ ...input, ...extra }).success).toBe(false);
    expect(() => createSohCertificate(vehicle, { ...input, measuredAt:"2026-10-11" }, actor, report.id, report.verifiedAt)).toThrow("toekomst");
    expect(() => createSohCertificate({ ...vehicle, updatedAt:"new" }, input, actor, report.id, report.verifiedAt)).toThrow("gewijzigd");
  });
  it("handles missing optional vehicle/battery/photo data without invention", () => {
    const snapshot = sohVehicleSnapshot({ ...vehicle, images:[], batteryHealthPercent:undefined, chargingPowerKw:undefined, licensePlate:undefined });
    expect(snapshot.battery).toEqual([]); expect(snapshot.photoUrl).toBeNull(); expect(snapshot.licensePlate).toBeNull();
    expect(sohVehicleSnapshot({ ...vehicle, images:["javascript:alert(1)"] }).photoUrl).toBeNull();
  });
  it("permits only owner/admin/sales/workshop to validate", () => {
    for (const role of ["owner", "admin", "sales", "workshop"] as const) expect(hasPermission(role, "vehicles.soh.write")).toBe(true);
    for (const role of ["marketing", "finance", "readonly"] as const) expect(hasPermission(role, "vehicles.soh.write")).toBe(false);
  });
  it("renders the official logo, source data and escaped measurement text without public links", () => {
    const markup = renderToStaticMarkup(createElement(SohCertificate, { report:{ ...report, method:"<script>alert(1)</script>" } }));
    expect(markup).toContain('/brand/vv-logo-horizontal-outlined.svg'); expect(markup).toContain("92,5"); expect(markup).toContain("TEST-01");
    expect(markup).toContain("&lt;script&gt;"); expect(markup).not.toContain("<script>"); expect(markup).not.toContain("QR");
    expect(() => validateSohCertificate({ ...report, status:"draft" })).toThrow();
  });
});
