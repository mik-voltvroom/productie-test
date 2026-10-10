import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get:vi.fn(), create:vi.fn(), set:vi.fn(), runTransaction:vi.fn() }));
vi.mock("@/lib/firebase-admin", () => ({ adminDb:{
  collection:(collection:string) => ({ doc:(id = "generated") => ({ id, path:`${collection}/${id}` }) }),
  runTransaction:mocks.runTransaction,
} }));
vi.mock("node:crypto", () => ({ randomUUID:() => "12345678-1234-4234-8234-123456789012" }));
import { getVehicleSohReport, saveVehicleSohReport } from "@/lib/repositories/soh-repository";
const vehicle = { brand:"Volvo", model:"XC60", trim:"T8", year:2021, mileageKm:82000, updatedAt:"2026-10-09T12:00:00.000Z", images:[], priceCents:3000000 };
const input = { sohPercent:91, method:"Diagnostic", measuredAt:"2020-01-01", expectedVehicleUpdatedAt:vehicle.updatedAt, expectedRevision:0 };
const actor = { uid:"staff", email:null, role:"sales" as const };
const snapshot = (data:unknown) => ({ exists:!!data, data:() => data, id:"12345678-1234-4234-8234-123456789012" });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.runTransaction.mockImplementation(fn => fn({ get:mocks.get, create:mocks.create, set:mocks.set }));
  mocks.get.mockResolvedValueOnce(snapshot(vehicle)).mockResolvedValueOnce(snapshot(null));
});
describe("SOH transactional repository", () => {
  it("atomically creates an immutable certificate, pointer and audit without writing vehicle/public data", async () => {
    const state = await saveVehicleSohReport("car-1", input, actor);
    expect(state.revision).toBe(1); expect(state.report?.vehicleId).toBe("car-1");
    expect(mocks.create).toHaveBeenCalledTimes(2); expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ path:"vehicleSohReports/car-1" }), { reportId:state.report!.id, revision:1 });
    expect(mocks.create.mock.calls.map(call => call[0].path)).toEqual([`sohCertificates/${state.report!.id}`, "audit_logs/generated"]);
    expect(mocks.create.mock.calls[1][1]).toMatchObject({ actor:{ uid:"staff", role:"sales" }, reportId:state.report!.id });
  });
  it("returns empty state for a vehicle without certificates", async () => {
    expect(await getVehicleSohReport("car-1")).toEqual({ report:null, revision:0 });
  });
  it("rejects missing vehicles before writes", async () => {
    mocks.get.mockReset().mockResolvedValueOnce(snapshot(null));
    await expect(saveVehicleSohReport("missing", input, actor)).rejects.toMatchObject({ status:404 });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled();
  });
  it("rejects concurrent colleague validations before writes", async () => {
    mocks.get.mockReset().mockResolvedValueOnce(snapshot(vehicle)).mockResolvedValueOnce(snapshot({ revision:1 }));
    await expect(saveVehicleSohReport("car-1", input, actor)).rejects.toMatchObject({ status:409 });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled();
  });
  it("rejects a Mobilox change during validation before writes", async () => {
    mocks.get.mockReset().mockResolvedValueOnce(snapshot({ ...vehicle, updatedAt:"2026-10-10T12:00:00.000Z" })).mockResolvedValueOnce(snapshot(null));
    await expect(saveVehicleSohReport("car-1", input, actor)).rejects.toMatchObject({ status:409 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuses to return a certificate for a different vehicle", async () => {
    const saved = await saveVehicleSohReport("other", input, actor);
    mocks.get.mockReset().mockResolvedValueOnce(snapshot(vehicle)).mockResolvedValueOnce(snapshot({ reportId:saved.report!.id, revision:1 })).mockResolvedValueOnce(snapshot(saved.report));
    await expect(getVehicleSohReport("car-1")).rejects.toThrow("mismatch");
  });
});
