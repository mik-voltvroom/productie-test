import { requireRole } from "@/lib/auth/session";
import { listAuditEvents } from "@/lib/audit/audit-log";

export default async function AuditPage() {
  await requireRole(["owner", "admin", "finance"]);
  const events = await listAuditEvents(50);
  return <main className="container dashboardPage">
    <div className="pageHeader"><div><p className="eyebrow">Security & control</p><h1>Auditlog</h1><p>Controleer gevoelige acties, integratiecontroles en mutaties.</p></div></div>
    <section className="panel">
      {events.length === 0 ? <p className="helper">Nog geen auditgebeurtenissen in deze omgeving.</p> : <div className="tableWrap"><table><thead><tr><th>Tijd</th><th>Actie</th><th>Onderdeel</th><th>Gebruiker</th><th>Resultaat</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString("nl-NL")}</td><td>{event.action}</td><td>{event.entityType}{event.entityId ? ` · ${event.entityId}` : ""}</td><td>{event.actor?.email ?? event.actor?.uid ?? "systeem"}</td><td>{event.outcome ?? "success"}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
