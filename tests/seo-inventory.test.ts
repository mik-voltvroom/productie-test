import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Vehicle } from "@/types";
const mock = vi.hoisted(() => ({ docs: [] as { id: string; data: () => Record<string, unknown> }[], failPage: -1, reads: 0, marker: undefined as unknown }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase-admin', () => {
  const query = (offset: number): any => ({ limit: () => query(offset), startAfter: (doc: { id: string }) => query(mock.docs.findIndex(d => d.id === doc.id) + 1),
    get: async () => { mock.reads++; if (offset === mock.failPage) throw new Error('synthetic failure'); return { docs: mock.docs.slice(offset, offset + 250) }; } });
  return { adminDb: { runTransaction: async (fn: (tx: unknown) => unknown) => fn({ get: (ref: { get: () => unknown }) => ref.get() }), collection: (name: string) => ({
    ...query(0), where: () => query(0),
    doc: (id: string) => ({ get: async () => { const doc = mock.docs.find(d => d.id === id); return { exists: !!doc, id, data: () => name === 'seoState' ? mock.marker : doc?.data() }; } }),
  }) } };
});
import { listPublicVehicles, getPublicVehicleBySlug, getPublicVehicleById, PublicInventoryUnavailable } from '@/lib/repositories/public-vehicle-repository';
import sitemap from '@/app/sitemap';

const make = (n: number, extra: Partial<Vehicle> = {}) => ({ id: `synthetic-${String(n).padStart(4, '0')}`, slug: `synthetic-${n}`, status: 'available',
  brand: 'Synthetic', model: 'Fixture', trim: 'Test', year: 2022, priceCents: 1000000, mileageKm: 0, images: ['https://example.test/photo.jpg'], highlights: [],
  source: { provider: 'mobilox-hexon', contentVersion: 1 }, publication: { channels: { website: true }, validationErrors: [] }, updatedAt: '2026-10-01T12:00:00Z', ...extra });
function set(values: ReturnType<typeof make>[]) { mock.docs = values.map(v => ({ id: v.id, data: () => v })); }
beforeEach(() => { vi.stubEnv('VVOS_ENV', 'production'); vi.stubEnv('VVOS_DATA_MODE', 'firebase'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.voltvroom.nl'); mock.failPage = -1; mock.reads = 0; set([]); });
afterEach(() => vi.unstubAllEnvs());
describe('public inventory and sitemap completeness', () => {
  it('reads multiple bounded pages, including a direct ID outside the first hundred', async () => {
    set(Array.from({ length: 510 }, (_, n) => make(n)));
    expect(await listPublicVehicles()).toHaveLength(510); expect(mock.reads).toBe(3);
    expect((await getPublicVehicleById('synthetic-0509'))?.slug).toBe('synthetic-509');
    expect((await getPublicVehicleBySlug('synthetic-509'))?.id).toBe('synthetic-0509');
    expect((await sitemap()).filter(x => x.url.includes('/voorraad/'))).toHaveLength(510);
  });
  it('keeps normalized identity deduplication and newest selection', async () => {
    set([make(1, { vin: 'ABC-123', updatedAt: '2026-10-01' }), make(2, { vin: 'abc123', updatedAt: '2026-10-02' })]);
    expect((await listPublicVehicles()).map(v => v.id)).toEqual(['synthetic-0002']);
    expect(await getPublicVehicleBySlug('synthetic-1')).toBeUndefined();
  });
  it('preserves the existing input order when duplicate timestamps tie', async () => {
    set([make(1, { id: 'VV-first', vin: 'ABC-123' }), make(2, { id: 'hexon-second', vin: 'abc123' })]);
    expect((await listPublicVehicles()).map(v => v.id)).toEqual(['VV-first']);
  });
  it.each(['reserved', 'sold', 'archived', 'draft'] as const)('does not publish %s', async status => {
    set([make(1, { status })]); expect(await listPublicVehicles()).toEqual([]); expect(await getPublicVehicleById('synthetic-0001')).toBeUndefined();
  });
  it('enforces all production publication gates before projecting fields', async () => {
    set([make(1, { publication: { channels: { website: false } } } as Partial<Vehicle>), make(2, { images: [] }),
      make(3, { publication: { channels: { website: true }, validationErrors: ['invalid'] } } as Partial<Vehicle>),
      make(4, { source: { provider: 'mobilox-hexon', inventoryStatus: 'reserved' } })]);
    expect(await listPublicVehicles()).toEqual([]);
  });
  it('separates genuine empty stock from a failing second page without publishing partial sitemap', async () => {
    expect(await listPublicVehicles()).toEqual([]);
    set(Array.from({ length: 251 }, (_, n) => make(n))); mock.failPage = 250;
    await expect(listPublicVehicles()).rejects.toBeInstanceOf(PublicInventoryUnavailable);
    await expect(sitemap()).rejects.toBeInstanceOf(PublicInventoryUnavailable);
  });
  it('does not publish demo stock in production with absent/wrong data mode', async () => {
    vi.stubEnv('VVOS_DATA_MODE', 'demo');
    await expect(listPublicVehicles()).rejects.toThrow('requires Firebase');
    await expect(getPublicVehicleById('VV-2026-001')).rejects.toThrow('requires Firebase');
    expect(await sitemap()).toEqual([]);
  });
  it('fails closed on duplicate slugs instead of choosing a vehicle or repeating a sitemap URL', async () => {
    set([make(1, { slug: 'same' }), make(2, { slug: 'same' })]);
    await expect(getPublicVehicleBySlug('same')).rejects.toThrow(); await expect(sitemap()).rejects.toThrow('Ambiguous');
  });
  it('omits unreliable import lastmod and all non-indexable sitemap URLs', async () => {
    set([make(1)]); const rows = await sitemap();
    expect(rows.every(r => !r.lastModified)).toBe(true);
    expect(rows.some(r => /dashboard|login|portal|\?/.test(r.url))).toBe(false);
    vi.stubEnv('VVOS_ENV', 'staging'); expect(await sitemap()).toEqual([]);
  });
});
