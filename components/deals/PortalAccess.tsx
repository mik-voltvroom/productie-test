"use client";
import { useState } from "react";
export function PortalAccess({ dealId }: { dealId: string }) {
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function change(action: "rotate" | "revoke") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/vvos/deals/${encodeURIComponent(dealId)}/portal`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Portaaltoegang wijzigen mislukt.");
      setLink(body.token ? `${window.location.origin}/portal/${body.token}` : "");
      setMessage(body.token ? "Nieuwe toegang gemaakt, zeven dagen geldig. Eerdere toegang is ingetrokken. Er is geen bericht verstuurd." : "Toegang ingetrokken.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Wijziging mislukt."); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>Klantportaaltoegang</h2><p>Een persoonlijke link geeft toegang tot de dossierstatus. Deel deze uitsluitend met de juiste klant.</p>
    <button type="button" className="button secondary" disabled={busy} onClick={() => void change("rotate")}>Nieuwe link maken</button>{" "}
    <button type="button" className="button secondary" disabled={busy} onClick={() => void change("revoke")}>Toegang intrekken</button>
    {message && <p role="status">{message}</p>}{link && <label>Persoonlijke link<input readOnly value={link} onFocus={event => event.target.select()}/></label>}
  </section>;
}
