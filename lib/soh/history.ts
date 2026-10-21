import { sohHistoryPointSchema, type SohCertificate, type SohHistoryPoint } from "./certificate";

/** One actual measurement per date; compare only the current measurement method. */
export function comparableSohHistory(report: SohCertificate, history: SohHistoryPoint[]): SohHistoryPoint[] {
  const byDate = new Map<string, SohHistoryPoint>();
  for (const candidate of [...history, report]) {
    const parsed = sohHistoryPointSchema.safeParse({ id:candidate.id, measuredAt:candidate.measuredAt,
      verifiedAt:candidate.verifiedAt, sohPercent:candidate.sohPercent, method:candidate.method });
    if (!parsed.success || parsed.data.method.trim().toLowerCase() !== report.method.trim().toLowerCase() || parsed.data.measuredAt > report.measuredAt) continue;
    const point = parsed.data;
    const current = byDate.get(point.measuredAt);
    if (!current || current.verifiedAt < point.verifiedAt) byDate.set(point.measuredAt, point);
  }
  return [...byDate.values()].sort((a,b) => a.measuredAt.localeCompare(b.measuredAt)).slice(-12);
}
