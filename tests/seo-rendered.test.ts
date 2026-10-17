import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock('@/lib/repositories/public-vehicle-repository', () => ({ getPublicVehicleBySlug: mock.lookup }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); }, redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import Page, { generateMetadata } from '@/app/voorraad/[slug]/page';
import { publicPageMetadata } from '@/lib/seo/metadata';
const fixture = { id:'synthetic',slug:'test-slug',brand:'Test',model:'Model',trim:'Edition',year:2022,mileageKm:0,priceCents:1234567,status:'available',images:['https://example.test/photo.jpg'],highlights:[],description:'Zichtbare brontekst </script> & é',driveType:'electric',fuelType:'Elektrisch' };
afterEach(() => vi.unstubAllEnvs());
describe('rendered vehicle and route metadata', () => {
  it('redirects observed aliases before rendering an Offer and preserves repeated attribution', async () => {
    mock.lookup.mockResolvedValue(fixture);
    const params = Promise.resolve({ slug: 'old-slug' });
    await expect(Page({ params, searchParams: Promise.resolve({ utm_source: ['google', 'test'], gclid: 'a&b' }) })).rejects.toThrow('REDIRECT:/voorraad/test-slug?utm_source=google&utm_source=test&gclid=a%26b');
    expect((await generateMetadata({ params })).alternates?.canonical).toContain('/voorraad/test-slug');
  });
  it('server-renders exactly one coherent vehicle entity, visible price and breadcrumb', async () => {
    mock.lookup.mockResolvedValue(fixture);
    const params = Promise.resolve({ slug: fixture.slug });
    const metadata = await generateMetadata({ params });
    const html = renderToStaticMarkup(await Page({ params }));
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const cars = blocks.filter(b => b['@type'].includes('Car'));
    expect(cars).toHaveLength(1); expect(blocks.some(b => b['@type'] === 'BreadcrumbList')).toBe(true);
    expect(cars[0].offers.price).toBe('12345.67'); expect(html).toContain('12.345,67');
    expect(cars[0].url).toBe(metadata.alternates?.canonical); expect(cars[0].description).toBe(fixture.description);
    expect(html).toContain('Zichtbare brontekst &lt;/script&gt; &amp; é');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });
  it('returns a real not-found result without rendering an offer for absent public data', async () => {
    mock.lookup.mockResolvedValue(undefined); const params = Promise.resolve({ slug: 'missing' });
    await expect(Page({ params })).rejects.toThrow('NOT_FOUND');
    expect((await generateMetadata({ params })).robots).toEqual({ index: false, follow: true });
  });
  it('propagates source failure rather than returning permanent not-found metadata', async () => {
    mock.lookup.mockRejectedValue(new Error('source unavailable')); const params = Promise.resolve({ slug: 'existing' });
    await expect(Page({ params })).rejects.toThrow('source unavailable'); await expect(generateMetadata({ params })).rejects.toThrow('source unavailable');
  });
  it('replaces homepage social inheritance with the page identity and explicit empty images', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://www.voltvroom.nl');
    const metadata = publicPageMetadata({title:'Voorraad', description:'Eigen beschrijving', alternates:{canonical:'/voorraad?utm_source=test'}});
    expect(metadata.alternates?.canonical).toBe('https://www.voltvroom.nl/voorraad');
    expect(metadata.openGraph).toMatchObject({title:'Voorraad',description:'Eigen beschrijving',url:'https://www.voltvroom.nl/voorraad',images:[]});
    expect(metadata.twitter).toMatchObject({title:'Voorraad',description:'Eigen beschrijving',images:[]});
  });
});
