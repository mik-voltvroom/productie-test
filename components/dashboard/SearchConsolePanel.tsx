import { safeSearchPage, type SearchReport } from "@/lib/search-console/business";

const number = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("nl-NL", { style: "percent", maximumFractionDigits: 1 });

export function SearchConsolePanel({ report }: { report: SearchReport }) {
  const messages = {
    disabled: "Search Console is nog niet ingeschakeld voor deze omgeving.",
    forbidden: "Google heeft de toegang geweigerd. Controleer de runtime-serviceaccount, propertyrechten en OAuth-scope.",
    unavailable: "Google-gegevens zijn tijdelijk niet beschikbaar. Probeer later opnieuw.",
    empty: "Google heeft geen definitieve gegevens voor deze periode teruggegeven. Dit bewijst niet dat pagina’s niet zijn geïndexeerd.",
    ready: "Zoekprestaties opgehaald uit Google Search Console.",
  };
  return <section className="panel" aria-labelledby="search-console-title">
    <h2 id="search-console-title">Google Search Console</h2>
    <p role="status">{messages[report.status]}</p>
    <p>Property: {report.property}<br />Meetperiode: {report.startDate} t/m {report.endDate} · Google-tijdzone: America/Los_Angeles.<br />Ophaalmoment: <time dateTime={report.checkedAt}>{report.checkedAt}</time>. Cache: maximaal 15 minuten.</p>
    {report.status === "ready" && report.totals && <>
      <dl className="metrics">
        <div className="metric"><dt>Klikken</dt><dd>{number.format(report.totals.clicks)}</dd></div>
        <div className="metric"><dt>Vertoningen</dt><dd>{number.format(report.totals.impressions)}</dd></div>
        <div className="metric"><dt>CTR</dt><dd>{percent.format(report.totals.ctr)}</dd></div>
        <div className="metric"><dt>Gemiddelde positie</dt><dd>{number.format(report.totals.position)}</dd></div>
      </dl>
      {[{ name: "Toppagina’s", rows: report.pages, links: true }, { name: "Topzoekopdrachten", rows: report.queries, links: false }].map(group => <div key={group.name}>
        <h3>{group.name}</h3>
        {group.rows.length ? <ul>{group.rows.map(row => <li key={row.label}>{group.links && safeSearchPage(row.label) ? <a href={row.label} target="_blank" rel="noopener noreferrer">{row.label}</a> : row.label}<br />{number.format(row.clicks)} klikken · {number.format(row.impressions)} vertoningen · CTR {percent.format(row.ctr)} · positie {number.format(row.position)}</li>)}</ul> : <p>Geen rijen teruggegeven.</p>}
      </div>)}
    </>}
    <p>Alleen definitieve webzoekgegevens; de recentste drie dagen zijn uitgesloten. Maximaal 10 rijen per lijst. Google kan zoekopdrachten weglaten vanwege privacy en interne datalimieten. Lijsttotalen zijn daarom niet gelijk aan het propertytotaal. Dit overzicht bewijst geen volledige indexatie of actuele posities.</p>
  </section>;
}
