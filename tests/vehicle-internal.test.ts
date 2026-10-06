import { describe, expect, it } from "vitest";
import { applyInternalVehicleUpdate, internalVehicleSchema } from "@/lib/vehicle/internal";
import { vehicles } from "@/lib/sample-data";
import { emptyCosts } from "@/lib/business";
import { defaultVehicleCommercial } from "@/lib/vehicle/business";
import { hasPermission } from "@/lib/auth/permissions";
const current = { ...vehicles[0], costs: emptyCosts, commercial: { ...defaultVehicleCommercial, priceHistory: [{ priceCents: 100, effectiveAt: '2026-10-01', source: 'mobilox-hexon' as const }], soldPriceCents: 200 } };
const input = { expectedUpdatedAt: current.updatedAt, costs: { ...emptyCosts, purchasePriceCents: 12300 }, commercial: { targetMarginCents: 100, maxStockDays: 40, viewCount: 0, leadCount: 0, acquiredAt: null, stockEnteredAt: null } };
describe('Internal vehicle boundary', () => {
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
