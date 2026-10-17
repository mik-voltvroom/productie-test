import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Vehicle } from "@/types";
import { buildVehicleLookup, selectPublicVehicles, validVehicleLookup } from "@/lib/vehicle-lookup/business";
import { publicVehicleProjection } from "@/lib/vehicle/editorial";
const state = vi.hoisted(() => ({ rows: [] as Vehicle[], queries: [] as string[], marker: { state: 'ready', version: 1 }, fail: false }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase-admin', () => {
  type Filter = [string, string, unknown];
  function query(filters: Filter[] = [], limit = 1001): any {
    return { where: (field: string, op: string, value: unknown) => query([...filters, [field, op, value]], limit), limit: (max: number) => query(filters, max),
      get: async () => {
        state.queries.push(filters.map(f => `${f[0]}:${f[1]}`).join(','));
        if (state.fail) throw new Error('private source error');
        const rows = state.rows.filter(row => filters.every(([field, op, target]) => {
          const value = field.split('.').reduce((obj: any, key) => obj?.[key], row);
          if (op === '==') return value === target;
          return Array.isArray(value) && (op === 'array-contains' ? value.includes(target) : value.some(key => (target as unknown[]).includes(key)));
        }));
        return { docs: rows.slice(0, limit).map(row => ({ id: row.id, data: () => row })) };
      } };
  }
  return { adminDb: { runTransaction: async (fn: (tx: any) => unknown) => fn({ get: (ref: any) => ref.get() }),
    collection: (name: string) => ({ ...query(), doc: (id: string) => ({ get: async () => {
      if (state.fail) throw new Error('private source error');
      const row = state.rows.find(row => row.id === id);
      return { id, exists: !!row, data: () => name === 'seoState' ? state.marker : row };
    } }) }) } };
});
import { getPublicVehicleBySlug, getPublicVehicleById, PublicInventoryUnavailable } from '@/lib/repositories/public-vehicle-repository';
function car(id: string, extra: Partial<Vehicle> = {}): Vehicle {
  const vehicle = { id, slug: id, vin: `TEST${id}`, brand: 'Test', model: 'Fixture', status: 'available', priceCents: 1000000, images: ['https://example.test/a.jpg'],
    highlights: [], updatedAt: '2026-10-01', publication: { channels: { website: true }, validationErrors: [] }, ...extra } as Vehicle;
  vehicle.publicLookup = buildVehicleLookup(undefined, vehicle);
  return vehicle;
}
beforeEach(() => { vi.stubEnv('VVOS_ENV', 'production'); vi.stubEnv('VVOS_DATA_MODE', 'firebase'); state.rows = []; state.queries = []; state.fail = false; state.marker = { state: 'ready', version: 1 }; });
afterEach(() => vi.unstubAllEnvs());
describe('indexed public vehicle lookup', () => {
  it('reads only the matching slug and identity component, beyond 100 vehicles', async () => {
    state.rows = Array.from({length: 510}, (_, i) => car(`car-${i}`, { vin: `VIN${i}` }));
    expect((await getPublicVehicleBySlug('car-509'))?.id).toBe('car-509');
    expect(state.queries).toEqual(['publicLookup.slugs:array-contains', 'status:==,publicLookup.identityKeys:array-contains-any']);
    expect(await getPublicVehicleById('car-509')).not.toHaveProperty('publicLookup');
  });
  it('preserves normalized identity winners, including a transitive A-B-C graph', async () => {
    const a = car('A', { vin: 'VIN-1', licensePlate: 'PLATE1', updatedAt: '2026-10-03' });
    const b = car('B', { vin: 'vin1', licensePlate: 'PLATE-2', updatedAt: '2026-10-02' });
    const c = car('C', { vin: 'VIN2', licensePlate: 'plate2', updatedAt: '2026-10-01' });
    state.rows = [c, b, a];
    expect(selectPublicVehicles(state.rows).map(row => row.id)).toEqual(['A', 'C']);
    expect(await getPublicVehicleBySlug('B')).toBeUndefined();
    expect(await getPublicVehicleById('B')).toBeUndefined();
    expect((await getPublicVehicleBySlug('C'))?.id).toBe('C');
  });
  it('uses document ID order for timestamp ties, independent of query discovery order', async () => {
    state.rows = [car('z', { vin: 'same' }), car('A', { vin: 'SAME' })];
    expect(await getPublicVehicleBySlug('z')).toBeUndefined(); expect((await getPublicVehicleBySlug('A'))?.id).toBe('A');
  });
  it('preserves only observed aliases and never accepts provider-supplied history', async () => {
    const previous = car('id', { slug: 'old' }), next = car('id', { slug: 'new' });
    next.publicLookup!.slugs.push('forged-provider-slug');
    next.publicLookup = buildVehicleLookup(previous, next);
    expect(next.publicLookup.slugs).toEqual(['old', 'new']);
    state.rows = [next]; expect((await getPublicVehicleBySlug('old'))?.slug).toBe('new');
    expect(await getPublicVehicleBySlug('forged-provider-slug')).toBeUndefined();
    expect(publicVehicleProjection(next)).not.toHaveProperty('publicLookup');
    previous.publication!.channels.website = false;
    previous.publicLookup = undefined;
    expect(buildVehicleLookup(previous, next).slugs).toEqual(['new']);
  });
  it('does not redirect to a different car when an external stock ID is reused or identity is unproven', () => {
    const old = car('id', { slug: 'old-car', vin:'VIN1', licensePlate:'PLATE1' });
    const replacement = car('id', { slug:'other-car', vin:'VIN2', licensePlate:'PLATE2' });
    expect(buildVehicleLookup(old,replacement).slugs).toEqual(['other-car']);
    expect(buildVehicleLookup(car('id',{vin:undefined,slug:'unproven'}),car('id',{vin:undefined,slug:'current'})).slugs).toEqual(['current']);
  });
  it('keeps chains, return to an earlier slug, and a same-identity republication without loops', async () => {
    const a = car('id',{slug:'a'}), b = car('id',{slug:'b'}); b.publicLookup = buildVehicleLookup(a,b);
    const c = car('id',{slug:'c'}); c.publicLookup = buildVehicleLookup(b,c); state.rows = [c];
    expect((await getPublicVehicleBySlug('a'))?.slug).toBe('c'); expect((await getPublicVehicleBySlug('b'))?.slug).toBe('c');
    c.status = 'sold'; const returned = car('id',{slug:'a'}); returned.publicLookup = buildVehicleLookup(c,returned); state.rows = [returned];
    expect((await getPublicVehicleBySlug('a'))?.slug).toBe('a'); expect((await getPublicVehicleBySlug('c'))?.slug).toBe('a');
    returned.publicLookup.slugs = Array.from({length:200},(_,i)=>`old-${i}`); returned.publicLookup.slugs[0] = 'a';
    expect(() => buildVehicleLookup(returned,car('id',{slug:'extra'}))).toThrow('review limit');
  });
  it.each(['sold', 'reserved', 'archived', 'draft'] as const)('withdraws aliases immediately for %s', async status => {
    const previous = car('id', { slug: 'old' }), next = car('id', { slug: 'new', status });
    next.publicLookup = buildVehicleLookup(previous, next); state.rows = [next];
    expect(await getPublicVehicleBySlug('old')).toBeUndefined(); expect(await getPublicVehicleById('id')).toBeUndefined();
  });
  it('filters unpublished and invalid stock before choosing identity winners', async () => {
    state.rows = [car('newer', {vin:'SAME', updatedAt:'2026-10-03', images:[]}), car('older',{vin:'same'})];
    expect((await getPublicVehicleBySlug('older'))?.id).toBe('older');
    state.rows[1].publication!.channels.website = false;
    expect(await getPublicVehicleBySlug('older')).toBeUndefined();
  });
  it('fails closed on collisions between current and historical slugs', async () => {
    const a = car('a'), b = car('b', { slug: 'new-b' }); b.publicLookup!.slugs.push('a'); state.rows = [a, b];
    await expect(getPublicVehicleBySlug('a')).rejects.toBeInstanceOf(PublicInventoryUnavailable);
  });
  it('does not reuse a withdrawn historical URL for a different public vehicle', async () => {
    const withdrawn = car('old-id',{status:'sold',slug:'previous-current'}); withdrawn.publicLookup!.slugs.push('old-url');
    state.rows = [withdrawn,car('different-id',{slug:'old-url'})];
    await expect(getPublicVehicleBySlug('old-url')).rejects.toBeInstanceOf(PublicInventoryUnavailable);
  });
  it('distinguishes absence from source errors, corrupt metadata and oversized components', async () => {
    expect(await getPublicVehicleBySlug('missing')).toBeUndefined();
    state.fail = true; await expect(getPublicVehicleBySlug('a')).rejects.toBeInstanceOf(PublicInventoryUnavailable); state.fail = false;
    const broken = car('broken', {vin:'v'}); broken.publicLookup!.identityKeys = []; state.rows = [broken];
    expect(validVehicleLookup(broken)).toBe(false); await expect(getPublicVehicleBySlug('broken')).rejects.toBeInstanceOf(PublicInventoryUnavailable);
    state.rows = Array.from({length:1001}, (_, i) => car(`id-${i}`, {vin:'SAME'}));
    await expect(getPublicVehicleBySlug('id-0')).rejects.toBeInstanceOf(PublicInventoryUnavailable);
  });
});
