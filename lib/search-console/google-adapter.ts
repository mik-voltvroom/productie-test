import { GoogleAuth } from "google-auth-library";
import { responseSchema, searchConsoleProperty, searchConsoleScope } from "./business";

const auth = new GoogleAuth({ scopes: [searchConsoleScope] });

export class SearchConsoleAccessError extends Error {}

/** ADC uses the workload identity; no downloaded key, browser token or user input. */
export async function querySearchConsole(startDate: string, endDate: string, dimensions: string[]) {
  try {
    const client = await auth.getClient();
    const result = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(searchConsoleProperty)}/searchAnalytics/query`,
      method: "POST", data: { startDate, endDate, dimensions, type: "web", dataState: "final", rowLimit: 10 },
      timeout: 8000, retry: false, signal: AbortSignal.timeout(10_000),
    });
    return responseSchema.parse(result.data).rows ?? [];
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) throw new SearchConsoleAccessError();
    // Provider payloads may contain credentials or private diagnostics. Never forward them.
    throw new Error("Search Console request failed");
  }
}
