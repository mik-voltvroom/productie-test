import { readCarCheck } from "@/lib/repositories/carcheck-repository";
import { publicCarCheck } from "@/lib/carcheck/business";
export async function PublicCarCheck({ vehicleId }: { vehicleId: string }) {
  try {
    const state = await readCarCheck(vehicleId);
    const report = publicCarCheck(state.released);
    if (!report) return null;
    return <section><h2>CarCheck — vrijgegeven samenvatting</h2><p>{report.summary}</p>
      <p>{report.coverage.checked}/{report.coverage.required} toepasselijke onderdelen gecontroleerd. Dit is inspectiedekking, geen kwaliteitsscore.</p>
      <small>Rapport {report.reportId} · vrijgegeven {new Date(report.releasedAt).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}</small>
    </section>;
  } catch {
    // No claim is better than an unverified or partially loaded report.
    return null;
  }
}
