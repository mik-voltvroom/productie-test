"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { grossMargin } from "@/lib/business";
import { eur } from "@/lib/format";
import { centsToEuros } from "@/lib/money";
import { listLeads } from "@/lib/repositories/lead-repository";
import { listVehicles } from "@/lib/repositories/vehicle-repository";
import type { Lead, Vehicle } from "@/types";

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([listVehicles(), listLeads()])
      .then(([vehicleItems, leadItems]) => {
        if (!active) return;
        setVehicles(vehicleItems);
        setLeads(leadItems);
        setError("");
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
  const marginCents = available.reduce(
    (sum, vehicle) => sum + (vehicle.costs ? grossMargin(vehicle.priceCents, vehicle.costs) : 0),
    0,
  );
  const incomplete = vehicles.filter(vehicle => (vehicle.publication?.validationErrors.length ?? 0) > 0).length;
  const recent = useMemo(
    () => vehicles.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 4),
    [vehicles],
  );
  const dataUnavailable = loading || Boolean(error);

  return <main className="container dashboardPage">
    <div className="pageTitle">
      <div><p className="eyebrow">VVOS command center</p><h1>Grip op voorraad, leads en marge.</h1></div>
      <Link href="/dashboard/voorraad/nieuw" className="button">+ Nieuwe auto</Link>
    </div>

    {loading ? <div className="notice">Actuele VVOS-gegevens laden…</div> : null}
    {error ? <div className="notice noticeError" role="alert">{error}</div> : null}

    <div className="metrics">
      <div className="metric"><strong>{dataUnavailable ? "–" : available.length}</strong><span className="muted">online voertuigen</span></div>
      <div className="metric"><strong>{dataUnavailable ? "–" : eur.format(centsToEuros(stockValueCents))}</strong><span className="muted">retail voorraadwaarde</span></div>
      <div className="metric"><strong>{dataUnavailable ? "–" : eur.format(centsToEuros(marginCents))}</strong><span className="muted">verwachte brutomarge</span></div>
      <div className="metric"><strong>{dataUnavailable ? "–" : leads.filter(lead => (lead.status ?? "new") === "new").length}</strong><span className="muted">onbehandelde leads</span></div>
    </div>

    <div className="dashboardGrid">
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Actie vereist</p><h2>Publicatiekwaliteit</h2></div><strong>{dataUnavailable ? "–" : incomplete}</strong></div>
        <p className="muted">Voertuigen met ontbrekende gegevens worden niet automatisch naar website of Merchant Center gestuurd.</p>
        <Link className="textLink" href="/dashboard/voorraad">Controleer voorraad →</Link>
      </section>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Merchant Center</p><h2>Feed gereed</h2></div><span className="successDot">Online</span></div>
        <p className="muted">De XML-route is actief. Definitieve verzending vereist Merchant Center-toelating en credentials.</p>
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
