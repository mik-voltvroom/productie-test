import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { safeSearchPage, searchConsolePeriod, responseSchema } from "@/lib/search-console/business";
import { SearchConsolePanel } from "@/components/dashboard/SearchConsolePanel";

const mocks = vi.hoisted(() => ({ request: vi.fn(), client: vi.fn() }));
vi.mock('google-auth-library', () => ({ GoogleAuth: class { getClient = mocks.client; } }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useRealTimers();
  vi.stubEnv('GOOGLE_SEARCH_CONSOLE_ENABLED', 'true'); vi.stubEnv('VVOS_ENV', 'production');
  vi.stubEnv('VVOS_DATA_MODE', 'firebase'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.voltvroom.nl');
  mocks.client.mockResolvedValue({ request: mocks.request });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

const metric = { clicks: 12, impressions: 100, ctr: .12, position: 4.2 };
describe('Search Console boundary', () => {
  it('uses Pacific dates across midnight and DST with 28 inclusive days', () => {
    expect(searchConsolePeriod(new Date('2026-01-01T01:00:00Z'))).toEqual({ startDate: '2025-12-01', endDate: '2025-12-28' });
    expect(searchConsolePeriod(new Date('2026-03-09T06:00:00Z'))).toEqual({ startDate: '2026-02-06', endDate: '2026-03-05' });
  });
  it('rejects unsafe page links and invalid upstream metrics', () => {
    for (const value of ['javascript:alert(1)', 'https://evil.test/', 'https://u:p@www.voltvroom.nl/']) expect(safeSearchPage(value)).toBeNull();
    expect(responseSchema.safeParse({ rows: [{ ...metric, clicks: -1 }] }).success).toBe(false);
    expect(responseSchema.safeParse({ rows: [{ ...metric, ctr: 2 }] }).success).toBe(false);
  });
  it.each(['staging', 'development'])('makes no Google calls in %s', async environment => {
    vi.stubEnv('VVOS_ENV', environment);
    const { getSearchConsoleReport } = await import('@/lib/search-console/service');
    expect((await getSearchConsoleReport()).status).toBe('disabled'); expect(mocks.client).not.toHaveBeenCalled();
  });
  it('does not call Google when disabled', async () => {
    vi.stubEnv('GOOGLE_SEARCH_CONSOLE_ENABLED', 'false');
    const { getSearchConsoleReport } = await import('@/lib/search-console/service');
    expect((await getSearchConsoleReport()).status).toBe('disabled'); expect(mocks.client).not.toHaveBeenCalled();
  });
  it('uses Google totals independently of top lists, removes unsafe URLs and deduplicates concurrent loads', async () => {
    mocks.request.mockImplementation(async ({ data }: { data: { dimensions: string[] } }) => ({ data: { rows: data.dimensions.length ? [{ ...metric, keys: [data.dimensions[0] === 'page' ? 'https://evil.test/' : '<script>private</script>'] }] : [metric] } }));
    const { getSearchConsoleReport } = await import('@/lib/search-console/service');
    const [a, b] = await Promise.all([getSearchConsoleReport(), getSearchConsoleReport()]);
    expect(a).toEqual(b); expect(a.status).toBe('ready'); expect(a.totals?.clicks).toBe(12); expect(a.pages).toEqual([]);
    await getSearchConsoleReport(); expect(mocks.request).toHaveBeenCalledTimes(3);
    for (const [request] of mocks.request.mock.calls) {
      expect(request.url).toContain('https%3A%2F%2Fwww.voltvroom.nl%2F');
      expect(request.data).toMatchObject({ type: 'web', dataState: 'final', rowLimit: 10 }); expect(request.retry).toBe(false);
    }
    const html = renderToStaticMarkup(SearchConsolePanel({ report: a }));
    expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>'); expect(html).toContain('12%');
  });
  it('labels successful empty data without inventing zero metrics or indexation', async () => {
    mocks.request.mockResolvedValue({ data: {} });
    const { getSearchConsoleReport } = await import('@/lib/search-console/service'); const report = await getSearchConsoleReport();
    expect(report.status).toBe('empty'); expect(report.totals).toBeNull();
    expect(renderToStaticMarkup(SearchConsolePanel({ report }))).toContain('Dit bewijst niet');
  });
  it.each([401, 403, 429, 500])('sanitizes upstream HTTP %s without fabricating success', async status => {
    mocks.request.mockRejectedValue({ response: { status, data: 'private bearer credential' } });
    const { getSearchConsoleReport } = await import('@/lib/search-console/service'); const report = await getSearchConsoleReport();
    expect(report.status).toBe(status === 401 || status === 403 ? 'forbidden' : 'unavailable'); expect(report.totals).toBeNull();
    expect(JSON.stringify(report)).not.toContain('private bearer');
  });
  it('bounds credential discovery stalls and caches transient errors briefly', async () => {
    vi.useFakeTimers(); mocks.client.mockImplementation(() => new Promise(() => {}));
    const { getSearchConsoleReport } = await import('@/lib/search-console/service'); const pending = getSearchConsoleReport();
    await vi.advanceTimersByTimeAsync(15_001); expect((await pending).status).toBe('unavailable');
    await getSearchConsoleReport(); expect(mocks.client).toHaveBeenCalledTimes(3);
  });
  it('treats malformed provider responses as unavailable', async () => {
    mocks.request.mockResolvedValue({ data: { rows: [{ clicks: 'wrong' }] } });
    const { getSearchConsoleReport } = await import('@/lib/search-console/service');
    expect((await getSearchConsoleReport()).status).toBe('unavailable');
  });
});
