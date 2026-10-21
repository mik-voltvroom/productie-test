"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { eur } from "@/lib/format";
import { centsToEuros } from "@/lib/money";
import { listLeads } from "@/lib/repositories/lead-repository";
import { listVehicles } from "@/lib/repositories/vehicle-repository";
import type { Lead, Vehicle } from "@/types";
import { morningSnapshot } from "@/lib/intelligence/business";
import { integrationMode } from "@/lib/config";

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all([listVehicles(), listLeads()])
      .then(([vehicleItems, leadItems]) => {
        if (!active) return;
        setVehicles(vehicleItems);
        setLeads(leadItems);
        setError("");
        setLoadedAt(new Date().toISOString());
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Actuele VVOS-gegevens konden niet worden geladen.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const available = vehicles.filter(vehicle => vehicle.status === "available");
  const stockValueCents = available.reduce((sum, vehicle) => sum + vehicle.priceCents, 0);
  const incomplete = vehicles.filter(vehicle => (vehicle.publication?.validationErrors.length ?? 0) > 0).length;
  const recent = useMemo(
    () => vehicles.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 4),
    [vehicles],
  );
  const dataUnavailable = loading || Boolean(error);
  const morning = morningSnapshot(vehicles, leads, loadedAt ? new Date(loadedAt) : new Date());

  return <main className="container dashboardPage">
    <div className="pageTitle">
      <div><p className="eyebrow">VVOS command center</p><h1>Grip op voorraad, leads en marge.</h1></div>
      <Link href="/dashboard/voorraad/nieuw" className="button">+ Nieuwe auto</Link>
    </div>

    {loading ? <div className="notice">Actuele VVOS-gegevens laden…</div> : null}
    {error ? <div className="notice noticeError" role="alert">{error}</div> : null}
    {loadedAt && !error ? <p className="muted">Bron: {integrationMode === "demo" ? "Lokale demo — synthetische gegevens" : "geautoriseerde VVOS-repositories"} · Opgehaald {new Date(loadedAt).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })} (Europe/Amsterdam). Vernieuw de pagina voor een nieuwe controle.</p> : null}

    <div className="metrics">
      <div className="metric"><strong>{dataUnavailable ? "–" : morning.published}</strong><span className="muted">online voertuigen</span></div>
      <div className="metric"><strong>{dataUnavailable ? "–" : eur.format(centsToEuros(stockValueCents))}</strong><span className="muted">retail voorraadwaarde</span></div>
      <div className="metric"><strong>{dataUnavailable || morning.expectedMarginCents === null ? "Onbekend" : eur.format(centsToEuros(morning.expectedMarginCents))}</strong><span className="muted">margescenario op ingevoerde kosten</span></div>
      <div className="metric"><strong>{dataUnavailable ? "–" : leads.filter(lead => (lead.status ?? "new") === "new").length}</strong><span className="muted">onbehandelde leads</span></div>
    </div>

    {!dataUnavailable ? <section className="panel"><h2>Morning Intelligence — opvolging</h2>
      <p>{morning.marginBasis} Bij {morning.missingCosts} voertuigen ontbreekt een bruikbare inkoopprijs.</p>
      <p>{morning.overdue.length} verlopen opvolgtermijnen · {morning.withoutOwner} open leads zonder eigenaar · {morning.unknownDeadline} zonder bekende volgende deadline.</p>
      <ol>{morning.overdue.slice(0, 10).map(lead => <li key={lead.id}><Link href={`/dashboard/leads/${lead.id}`}>Open aanvraag</Link> — termijn {new Date(lead.dueAt).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</li>)}</ol>
      <p>{morning.aged} beschikbare voertuigen staan 60 dagen of langer op voorraad. Bij {morning.unknownAge} ontbreekt de voorraaddatum. CarCheck-dekking: controleer het voertuigdossier; niet afgeleid uit een ingevuld accupercentage.</p>
    </section> : null}

    <div className="dashboardGrid">
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Actie vereist</p><h2>Publicatiekwaliteit</h2></div><strong>{dataUnavailable ? "–" : incomplete}</strong></div>
        <p className="muted">Voertuigen met ontbrekende gegevens worden niet automatisch naar website of Merchant Center gestuurd.</p>
        <Link className="textLink" href="/dashboard/voorraad">Controleer voorraad →</Link>
      </section>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Merchant Center</p><h2>Gezondheid niet gecontroleerd</h2></div></div>
        <p className="muted">Een aanwezige feedroute bewijst geen succesvolle verwerking door Google. Controleer de feed en het Merchant Center-account.</p>
        <a className="textLink" href="/api/merchant-feed" target="_blank" rel="noopener noreferrer">Bekijk XML-feed →</a>
      </section>
    </div>

    <section className="panel">
      <div className="panelHeader"><div><p className="eyebrow">Recent</p><h2>Laatst bijgewerkte voertuigen</h2></div><Link href="/dashboard/voorraad">Alles bekijken</Link></div>
      <div className="recentList">
        {dataUnavailable ? null : recent.map(vehicle => <Link href={`/dashboard/voorraad/${vehicle.id}`} key={vehicle.id}>
          {vehicle.images[0] ? <img src={vehicle.images[0]} alt="" /> : null}
          <span><strong>{vehicle.brand} {vehicle.model}</strong><small>{vehicle.status} · {new Date(vehicle.updatedAt).toLocaleDateString("nl-NL")}</small></span>
          <b>{eur.format(centsToEuros(vehicle.priceCents))}</b>
        </Link>)}
      </div>
      {!dataUnavailable && recent.length === 0 ? <p className="muted">Nog geen voertuigen in de actuele voorraad.</p> : null}
    </section>
  </main>;
}
