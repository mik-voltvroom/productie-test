import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? "")) throw new Error("Local emulator required");
const app = initializeApp({ projectId: "vvos-rules-test" }, "operational-flow");
const db = getFirestore(app);
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-admin", () => ({ get adminDb() { return db; } }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumePublicLeadQuota: async () => ({ allowed: true }) }));
const notification = vi.hoisted(() => vi.fn(async () => ({ configured: true, sent: 0, failed: 1 })));
vi.mock("@/lib/communications/lead-notification", () => ({ sendLeadNotification: notification }));
import { POST } from "@/app/api/leads/route";
import { createLeadOnce } from "@/lib/repositories/lead-submission";
import { readCrm, saveCrm, updateLead } from "@/lib/repositories/crm-server";
import { readCarCheck, saveCarCheck } from "@/lib/repositories/carcheck-repository";
import { rotatePortalAccess, readPortal } from "@/lib/repositories/portal-repository";
import { getPublicVehicleById } from "@/lib/repositories/public-vehicle-repository";
import { requiredSections, publicCarCheck, type Inspection } from "@/lib/carcheck/business";
const actor = { uid: "synthetic-staff", role: "owner" as const, email: null };
const car = { id: "synthetic-car", slug: "synthetic-car", brand: "Test", model: "Model", trim: "Test", year: 2022,
  mileageKm: 100, priceCents: 2000000, driveType: "combustion", status: "available", updatedAt: "2026-10-21T09:00:00Z",
  images: ["https://example.invalid/test.jpg"], highlights: [], publication: { channels: { website: true }, validationErrors: [] },
  costs: { purchasePriceCents: 1000000, transportCents: 0, preparationCents: 0, maintenanceCents: 0, warrantyReserveCents: 0, advertisingCents: 0, financingCents: 0, otherCents: 0 } };
beforeEach(async () => {
  vi.stubEnv("VVOS_ENV", "staging"); vi.stubEnv("VVOS_DATA_MODE", "firebase"); vi.stubEnv("VVOS_PORTAL_ENABLED", "true");
  for (const name of ["vehicles", "leads", "leadSubmissions", "leadActivities", "appointments", "vehicleCarChecks", "carCheckReports", "carCheckEvidence", "customerPortalTokens", "dealPortalAccess", "deals", "seoState"]) await db.recursiveDelete(db.collection(name));
  await db.collection("vehicles").doc(car.id).set(car);
  notification.mockClear();
});
afterAll(async () => { vi.unstubAllEnvs(); await db.terminate(); await deleteApp(app); });
describe("durable operation against real local Firestore", () => {
  it("connects public vehicle, saved request, failed notification, replay and staff follow-up", async () => {
    const vehicle = await getPublicVehicleById(car.id);
    expect(vehicle?.id).toBe(car.id); expect(vehicle).not.toHaveProperty("costs");
    const key = randomUUID();
    const body = { vehicleId: car.id, name: "Synthetic", email: "synthetic@example.invalid", consent: true, channel: "website" };
    const request = () => new Request("https://example.test/api/leads", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) });
    const response = await POST(request()); expect(response.status).toBe(201);
    const id = (await response.json()).lead.id;
    expect((await db.collection("leads").doc(id).get()).data()).toMatchObject({ vehicleId: car.id, notification: { status: "failed" } });
    // Withdrawal after the original accepted request must not make its retry a new lead.
    await db.collection("vehicles").doc(car.id).update({ status: "sold" });
    expect((await POST(request())).status).toBe(200);
    expect((await db.collection("leads").get()).size).toBe(1); expect(notification).toHaveBeenCalledOnce();
    await updateLead(id, { owner: actor.uid, status: "contacted", nextActionAt: "2026-10-22T10:00:00Z" }, actor);
    await saveCrm("leadActivities", { id: "synthetic-contact", leadId: id, type: "call", summary: "Synthetic contact", createdAt: "2026-10-21T10:00:00Z" }, actor);
    expect((await readCrm("leads"))[0]).toMatchObject({ owner: actor.uid, status: "contacted", vehicleId: car.id, notification: { status: "failed" } });
    expect(await readCrm("leadActivities", id)).toHaveLength(2);
  });
  it("serializes simultaneous retries and rejects key reuse with changed input", async () => {
    const key = randomUUID();
    const input = { synthetic: true };
    const results = await Promise.all([1, 2].map(i => createLeadOnce(key, input, `race-${i}`, { createdAt: "2026-10-21T09:00:00Z" })));
    expect(results.filter(result => result.created)).toHaveLength(1);
    expect(new Set(results.map(result => result.id)).size).toBe(1);
    await expect(createLeadOnce(key, { synthetic: false }, "race-3", {})).rejects.toThrow("andere gegevens");
  });
  it("stores immutable released CarCheck snapshots and rejects stale edits or cross-vehicle evidence", async () => {
    const evidence = randomUUID(); await db.collection("carCheckEvidence").doc(evidence).set({ vehicleId: car.id });
    const inspection: Inspection = { findings: requiredSections("combustion").map(section => ({ section, result: "good", note: "Synthetic" })), measurements: [], evidenceIds: [evidence], publicSummary: "Reviewed synthetic", publicationApproved: true };
    const input = { expectedRevision: 0, expectedVehicleUpdatedAt: car.updatedAt, status: "review" as const, inspection };
    await saveCarCheck(car.id, input, actor);
    await expect(saveCarCheck(car.id, input, actor)).rejects.toThrow("gewijzigd");
    const released = await saveCarCheck(car.id, { ...input, expectedRevision: 1, status: "released" }, actor);
    await saveCarCheck(car.id, { ...input, expectedRevision: 2, status: "draft", inspection: { ...inspection, publicSummary: "Private later edit" } }, actor);
    const state = await readCarCheck(car.id);
    expect(state.released?.id).toBe(released.report.id);
    expect(publicCarCheck(state.released)?.summary).toBe("Reviewed synthetic");
    expect(state.report?.inspection.publicSummary).toBe("Private later edit");
    await db.collection("carCheckEvidence").doc(evidence).update({ vehicleId: "other" });
    await expect(saveCarCheck(car.id, { ...input, expectedRevision: 3 }, actor)).rejects.toThrow("ander voertuig");
  });
  it("rotates, expires and revokes portal access without exposing private deal fields", async () => {
    await db.collection("deals").doc("synthetic-deal").set({ status: "reserved", customer: { email: "private@example.invalid" }, internalCostCents: 1000000 });
    const first = await rotatePortalAccess("synthetic-deal", actor, false);
    const view = await readPortal(first.token!);
    expect(view?.status).toBe("reserved"); expect(JSON.stringify(view)).not.toContain("private");
    const second = await rotatePortalAccess("synthetic-deal", actor, false);
    expect(await readPortal(first.token!)).toBeNull(); expect(await readPortal(second.token!)).not.toBeNull();
    await rotatePortalAccess("synthetic-deal", actor, true); expect(await readPortal(second.token!)).toBeNull();
    const third = await rotatePortalAccess("synthetic-deal", actor, false);
    for (const row of (await db.collection("customerPortalTokens").get()).docs) await row.ref.update({ expiresAt: "2020-01-01T00:00:00Z" });
    expect(await readPortal(third.token!)).toBeNull();
  });
});
