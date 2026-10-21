import { describe, expect, it } from "vitest";
import { applyInternalVehicleUpdate, internalVehicleSchema } from "@/lib/vehicle/internal";
import { vehicles } from "@/lib/sample-data";
import { emptyCosts } from "@/lib/business";
import { defaultVehicleCommercial } from "@/lib/vehicle/business";
import { hasPermission } from "@/lib/auth/permissions";
import { vehicleRange } from "@/lib/vehicle/range";
import { buildMobiloxReplacement } from "@/lib/vehicle/mobilox";
import { publicVehicleProjection } from "@/lib/vehicle/editorial";
const current = { ...vehicles[0], costs: emptyCosts, commercial: { ...defaultVehicleCommercial, priceHistory: [{ priceCents: 100, effectiveAt: '2026-10-01', source: 'mobilox-hexon' as const }], soldPriceCents: 200 } };
const input = { expectedUpdatedAt: current.updatedAt, costs: { ...emptyCosts, purchasePriceCents: 12300 }, commercial: { targetMarginCents: 100, maxStockDays: 40, viewCount: 0, leadCount: 0, acquiredAt: null, stockEnteredAt: null } };
describe('Internal vehicle boundary', () => {
  it('preserves internal range overrides through Mobilox refreshes without changing public source values', () => {
    const source = { ...current, wltpRangeKm:418, realisticRangeKm:320 };
    const saved = applyInternalVehicleUpdate(source, { ...input, rangeOverrides:{ wltpRangeKm:400, realisticRangeKm:300 } }, 'saved');
    const refreshed = buildMobiloxReplacement(saved, { ...source, wltpRangeKm:450, realisticRangeKm:350 }, [], 'sync');
    expect(vehicleRange(refreshed, 'wltpRangeKm')).toBe(400);
    expect(vehicleRange(refreshed, 'realisticRangeKm')).toBe(300);
    expect(publicVehicleProjection(refreshed).wltpRangeKm).toBe(450);
    expect(publicVehicleProjection(refreshed)).not.toHaveProperty('rangeOverrides');
    const reset = applyInternalVehicleUpdate(refreshed, { ...input, expectedUpdatedAt:refreshed.updatedAt, rangeOverrides:{} }, 'reset');
    expect(vehicleRange(reset, 'wltpRangeKm')).toBe(450);
    expect(vehicleRange(reset, 'realisticRangeKm')).toBe(350);
  });
  it('supports blank manual fields, missing source data and older clients without losing overrides', () => {
    const saved = applyInternalVehicleUpdate(current, { ...input, rangeOverrides:{ wltpRangeKm:null, realisticRangeKm:320 } }, 'new');
    expect(vehicleRange(saved, 'wltpRangeKm')).toBeUndefined();
    const legacySave = applyInternalVehicleUpdate(saved, { ...input, expectedUpdatedAt:'new' }, 'newer');
    expect(legacySave.rangeOverrides).toEqual(saved.rangeOverrides);
    expect(vehicleRange({ ...current, wltpRangeKm:undefined }, 'wltpRangeKm')).toBeUndefined();
  });
  it.each([-1, 0, 3.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid internal range %s', value => {
    for (const key of ['wltpRangeKm', 'realisticRangeKm'])
      expect(internalVehicleSchema.safeParse({ ...input, rangeOverrides:{ [key]:value } }).success).toBe(false);
    expect(internalVehicleSchema.safeParse({ ...input, rangeOverrides:{ priceCents:100 } }).success).toBe(false);
  });
  it('rejects every source field and nested financial history injection', () => {
    for (const key of ['priceCents', 'images', 'editorial', 'highlights', 'description', 'source', 'status', 'publication']) expect(internalVehicleSchema.safeParse({ ...input, [key]: null }).success).toBe(false);
    expect(internalVehicleSchema.safeParse({ ...input, commercial: { ...input.commercial, priceHistory: [] } }).success).toBe(false);
    expect(internalVehicleSchema.safeParse({ ...input, costs: { ...input.costs, purchasePriceCents: -1 } }).success).toBe(false);
  });
  it('saves only internal fields and retains source content and deal-owned values', () => {
    const next = applyInternalVehicleUpdate(current, input, 'new-time');
    expect(next.images).toEqual(current.images); expect(next.description).toBe(current.description);
    expect(next.costs?.purchasePriceCents).toBe(12300);
    expect(next.commercial?.priceHistory).toEqual(current.commercial.priceHistory);
    expect(next.commercial?.soldPriceCents).toBe(200);
    expect(() => applyInternalVehicleUpdate(current, { ...input, expectedUpdatedAt: 'stale' }, 'now')).toThrow('Herlaad');
  });
  it('limits internal editing to previous inventory-maintenance roles', () => {
    for (const role of ['owner', 'admin', 'sales'] as const) expect(hasPermission(role, 'vehicles.internal.write')).toBe(true);
    for (const role of ['marketing', 'readonly', 'workshop'] as const) expect(hasPermission(role, 'vehicles.internal.write')).toBe(false);
  });
});
