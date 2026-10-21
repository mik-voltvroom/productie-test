"use client";
import { useEffect, useState } from "react";
import type { IntegrationStatus } from "@/types";
export function IntegrationsPanel() {
  const [items, setItems] = useState<IntegrationStatus[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/integrations/status").then(r => r.json()).then(setItems); }, []);
  async function sync() { setMessage("Synchroniseren…"); const data = await fetch("/api/merchant-sync", { method: "POST" }).then(r => r.json()); setMessage(data.message); }
  return <><div className="integrationGrid">{items.map(item => <article className="panel integrationCard" key={item.key}><div className="panelHeader"><h2>{item.label}</h2><span className={`modeBadge ${item.mode}`}>{item.mode}</span></div><p>{item.detail}</p><small>{item.configured ? "Configuratie gevonden" : "Nog niet gekoppeld"}</small></article>)}</div><section className="panel"><div className="panelHeader"><div><p className="eyebrow">Publicatie</p><h2>Merchant Center synchronisatie</h2></div><button className="button" type="button" onClick={sync}>Nu synchroniseren</button></div>{message && <p className="syncMessage">{message}</p>}<p className="helper">De XML-feed blijft beschikbaar op <code>/api/merchant-feed</code>. API-push wordt actief zodra Google-credentials zijn toegevoegd.</p></section></>;
}
