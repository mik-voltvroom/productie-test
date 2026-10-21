import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/auth/api', () => ({ authorizeApi: mocks.auth }));
vi.mock('@/lib/repositories/vehicle-internal-repository', () => ({ updateVehicleInternal: mocks.update }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
import { PATCH } from '@/app/api/vvos/vehicles/[id]/internal/route';
import { emptyCosts } from '@/lib/business';
const input = { expectedUpdatedAt: 'old', costs: emptyCosts, commercial: { targetMarginCents: 0, maxStockDays: 40, viewCount: 0, leadCount: 0, acquiredAt: null, stockEnteredAt: null } };
const context = { params: Promise.resolve({ id: 'test' }) };
const request = (body: unknown, origin = 'https://example.test') => new Request('https://example.test/api/vvos/vehicles/test/internal', { method: 'PATCH', headers: { origin }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ actor: { uid: 'test', role: 'owner', email: null } }); });
describe('Internal API', () => {
  it('accepts the configured site behind a proxy and rejects a missing origin', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://site.example.test');
    try {
      mocks.update.mockResolvedValue({ id:'test', slug:'test' });
      const proxied = new Request('http://internal:8080/api/vvos/vehicles/test/internal', { method:'PATCH', headers:{ origin:'https://site.example.test' }, body:JSON.stringify(input) });
      expect((await PATCH(proxied, context)).status).toBe(200);
      mocks.update.mockClear();
      expect((await PATCH(new Request('https://example.test/api/vvos/vehicles/test/internal', { method:'PATCH', body:JSON.stringify(input) }), context)).status).toBe(403);
      expect(mocks.update).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it('validates and passes separate range overrides through the authorized API', async () => {
    const body = { ...input, rangeOverrides:{ wltpRangeKm:418, realisticRangeKm:320 } };
    mocks.update.mockResolvedValue({ id:'test', slug:'test', rangeOverrides:body.rangeOverrides });
    expect((await PATCH(request(body), context)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith('test', body, expect.objectContaining({ uid:'test' }));
    mocks.update.mockClear();
    expect((await PATCH(request({ ...body, rangeOverrides:{ realisticRangeKm:-1 } }), context)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('authorizes before any repository access', async () => {
    mocks.auth.mockResolvedValue({ actor: null, response: new Response(null, { status: 403 }) });
    expect((await PATCH(request(input), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('rejects source field injection and cross-origin changes', async () => {
    expect((await PATCH(request({ ...input, images: [] }), context)).status).toBe(400);
    expect((await PATCH(request(input, 'https://other.test'), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('returns exactly the committed document for optimistic concurrency', async () => {
    mocks.update.mockResolvedValue({ id: 'test', slug: 'test', updatedAt: 'committed' });
    const response = await PATCH(request(input), context);
    expect(response.status).toBe(200); expect((await response.json()).vehicle.updatedAt).toBe('committed');
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), 'vehicles.internal.write');
  });
});
