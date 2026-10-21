import { notFound } from "next/navigation";
import { readPortal } from "@/lib/repositories/portal-repository";
export const dynamic = "force-dynamic";
const labels: Record<string, string> = { draft: "In voorbereiding", reserved: "Gereserveerd", signed: "Overeenkomst bevestigd", ready: "Gereed", delivered: "Afgeleverd", cancelled: "Geannuleerd" };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  let portal;
  try { portal = await readPortal((await params).token); }
  catch { return <main className="container"><h1>Klantportaal tijdelijk niet beschikbaar</h1><p>Neem contact op met Volt &amp; Vroom voor de actuele dossierstatus.</p></main>; }
  if (!portal) notFound();
  return <main className="container"><h1>Uw verkoopdossier</h1><section className="panel"><p>Referentie: {portal.reference}</p><p>Status: {labels[portal.status] || "Neem contact op voor de actuele status"}</p><p>Geplande aflevering: {portal.plannedDeliveryAt ? new Date(portal.plannedDeliveryAt).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }) : "Nog niet gepland"}.</p><p>Deze persoonlijke toegang verloopt op {new Date(portal.expiresAt).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}.</p></section></main>;
}
