import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ document:{} as Record<string, unknown>, update:vi.fn(), create:vi.fn() }));
vi.mock("@/lib/firebase-admin", () => ({ adminDb:{
  collection:(name:string) => ({ doc:(id?:string) => ({ path:`${name}/${id ?? 'audit'}` }) }),
  runTransaction:async (fn:any) => fn({ get:async () => ({ exists:true, data:() => mock.document }), update:mock.update, create:mock.create }),
} }));
import { updateVehicleInternal } from "@/lib/repositories/vehicle-internal-repository";
import { vehicles } from "@/lib/sample-data";
import { emptyCosts } from "@/lib/business";
const input = { expectedUpdatedAt:'2026-10-10T10:00:00.000Z', costs:emptyCosts, commercial:{ targetMarginCents:0, maxStockDays:40, viewCount:0, leadCount:0, acquiredAt:null, stockEnteredAt:null },
  rangeOverrides:{ wltpRangeKm:418, realisticRangeKm:320 } };
beforeEach(() => { vi.clearAllMocks(); mock.document = { ...vehicles[0], updatedAt:'2026-10-10T10:00:00.000Z' }; });
describe("Internal range persistence", () => {
  it("commits range overrides and audit together without updating source fields", async () => {
    const result = await updateVehicleInternal('test', input, { uid:'staff', email:null, role:'sales' });
    expect(result.rangeOverrides).toEqual(input.rangeOverrides);
    const persisted = mock.update.mock.calls[0][1];
    expect(persisted.rangeOverrides).toEqual(input.rangeOverrides);
    expect(persisted).not.toHaveProperty('wltpRangeKm'); expect(persisted).not.toHaveProperty('realisticRangeKm');
    expect(mock.create).toHaveBeenCalledTimes(1);
  });
  it("rejects a stale edit before any write", async () => {
    await expect(updateVehicleInternal('test', { ...input, expectedUpdatedAt:'stale' }, { uid:'staff', email:null, role:'sales' })).rejects.toThrow('Herlaad');
    expect(mock.update).not.toHaveBeenCalled(); expect(mock.create).not.toHaveBeenCalled();
  });
});
