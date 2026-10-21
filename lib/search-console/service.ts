import { siteConfiguration } from "@/lib/environment/business";
import { querySearchConsole, SearchConsoleAccessError } from "./google-adapter";
import { safeSearchPage, searchConsolePeriod, searchConsoleProperty, type SearchReport } from "./business";

let cached: { until: number; report: SearchReport } | undefined;
let pending: Promise<SearchReport> | undefined;

/** Call only after server-side session and integration/vehicle permission checks. */
export async function getSearchConsoleReport(): Promise<SearchReport> {
  const now = new Date();
  const base: SearchReport = { status: "disabled", checkedAt: now.toISOString(), ...searchConsolePeriod(now), property: searchConsoleProperty, totals: null, pages: [], queries: [] };
  if (process.env.GOOGLE_SEARCH_CONSOLE_ENABLED !== "true" || !siteConfiguration(process.env).indexable) return base;
  if (cached && cached.until > now.getTime() && cached.report.endDate === base.endDate) return cached.report;
  if (pending) return pending;
  pending = loadReport(base).then(report => {
    cached = { report, until: Date.now() + (["ready", "empty"].includes(report.status) ? 900_000 : 60_000) };
    return report;
  }).finally(() => { pending = undefined; });
  return pending;
}

async function loadReport(base: SearchReport): Promise<SearchReport> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const requests = Promise.all([[], ["page"], ["query"]].map(dimensions => querySearchConsole(base.startDate, base.endDate, dimensions)));
    const [totals, pages, queries] = await Promise.race([requests, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 15_000); })]);
    return { ...base, status: totals.length ? "ready" : "empty", totals: totals[0] ?? null,
      pages: pages.flatMap(row => { const label = safeSearchPage(row.keys?.[0] ?? ""); return label ? [{ clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position, label }] : []; }),
      queries: queries.flatMap(row => row.keys?.length === 1 ? [{ clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position, label: row.keys[0] }] : []),
    };
  } catch (error) {
    return { ...base, status: error instanceof SearchConsoleAccessError ? "forbidden" : "unavailable" };
  } finally { if (timer) clearTimeout(timer); }
}
