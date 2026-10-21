import { z } from "zod";

export const searchConsoleProperty = "https://www.voltvroom.nl/";
export const searchConsoleScope = "https://www.googleapis.com/auth/webmasters.readonly";
export const metricsSchema = z.object({
  clicks: z.number().finite().nonnegative(), impressions: z.number().finite().nonnegative(),
  ctr: z.number().finite().min(0).max(1), position: z.number().finite().nonnegative(),
});
export const responseSchema = z.object({ rows: z.array(metricsSchema.extend({ keys: z.array(z.string().max(4096)).optional() })).max(10).optional() });
export type SearchMetrics = z.infer<typeof metricsSchema>;
export type SearchRow = SearchMetrics & { label: string };
export interface SearchReport {
  status: "disabled" | "ready" | "empty" | "forbidden" | "unavailable";
  checkedAt: string;
  startDate: string;
  endDate: string;
  property: string;
  totals: SearchMetrics | null;
  pages: SearchRow[];
  queries: SearchRow[];
}

/** Google uses Pacific calendar dates. Include 28 days, ending three days ago. */
export function searchConsolePeriod(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (name: string) => parts.find(p => p.type === name)!.value;
  const midnight = Date.parse(`${value("year")}-${value("month")}-${value("day")}T12:00:00Z`);
  const day = (offset: number) => new Date(midnight - offset * 86_400_000).toISOString().slice(0, 10);
  return { startDate: day(30), endDate: day(3) };
}

export function safeSearchPage(value: string): string | null {
  try {
    const url = new URL(value);
    return url.origin === new URL(searchConsoleProperty).origin && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
