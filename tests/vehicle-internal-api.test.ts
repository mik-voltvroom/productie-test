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
