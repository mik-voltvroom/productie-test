import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ session: vi.fn(), inventory: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(url); }) }));
vi.mock('@/lib/auth/session', () => ({ requireVerifiedSession: mocks.session }));
vi.mock('@/lib/repositories/public-vehicle-repository', () => ({ listPublicVehicles: mocks.inventory }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }));
import Page from '@/app/dashboard/seo/page';
beforeEach(() => { vi.stubEnv('VVOS_ENV', 'production'); vi.stubEnv('VVOS_DATA_MODE', 'firebase'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.voltvroom.nl'); vi.clearAllMocks(); mocks.inventory.mockResolvedValue([]); });
afterEach(() => vi.unstubAllEnvs());
describe('read-only SEO dashboard', () => {
  it.each(['owner', 'admin', 'marketing'])('permits the existing integration/vehicle permissions for %s', async role => {
    mocks.session.mockResolvedValue({ role }); const html = renderToStaticMarkup(await Page());
    expect(html).toContain('SEO-controle'); expect(html).toContain('Niet gekoppeld'); expect(html).toContain('Core Web Vitals: onbekend');
  });
  it.each(['sales', 'workshop', 'finance', 'readonly'])('denies %s before reading data', async role => {
    mocks.session.mockResolvedValue({ role }); await expect(Page()).rejects.toThrow('forbidden'); expect(mocks.inventory).not.toHaveBeenCalled();
  });
  it('denies a missing or invalid session before accessing inventory', async () => {
    mocks.session.mockResolvedValue(null); await expect(Page()).rejects.toThrow('/login'); expect(mocks.inventory).not.toHaveBeenCalled();
  });
  it('shows a source failure as unknown rather than zero public vehicles', async () => {
    mocks.session.mockResolvedValue({ role: 'owner' }); mocks.inventory.mockRejectedValue(new Error('synthetic private payload'));
    const html = renderToStaticMarkup(await Page()); expect(html).toContain('zijn onbekend'); expect(html).not.toContain('synthetic private payload'); expect(html).not.toContain('>0<');
  });
  it('renders previews without internal fields and labels local evidence honestly', async () => {
    mocks.session.mockResolvedValue({ role: 'marketing' });
    mocks.inventory.mockResolvedValue([{ id:'synthetic',slug:'test',brand:'Test',model:'Model',trim:'Edition',year:2022,mileageKm:0,priceCents:1000000,status:'available',images:['https://example.test/photo.jpg'],vin:'private-vin',licensePlate:'private-plate',costs:{ purchasePriceCents:1 } }]);
    const html = renderToStaticMarkup(await Page()); expect(html).toContain('Car + Product'); expect(html).toContain('Offer: aanwezig');
    expect(html).not.toMatch(/private-vin|private-plate|purchasePriceCents/); expect(html).toContain('geen externe schemavalidatie');
  });
});
