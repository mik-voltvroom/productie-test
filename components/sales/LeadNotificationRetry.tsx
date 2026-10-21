"use client";
import { useState } from "react";
import type { Lead } from "@/types";
export function LeadNotificationRetry({ lead, onUpdated }: { lead: Lead; onUpdated: () => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!lead.notification || lead.notification.status === "sent") return null;
  async function retry() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/vvos/leads/${encodeURIComponent(lead.id!)}/notification`, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: lead.notification!.updatedAt, acknowledgePossibleDuplicate: confirmed }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Herhalen mislukt.");
      setMessage(body.notification === "sent" ? "Chat-melding bevestigd." : "Chat-melding niet bevestigd; volg de lead rechtstreeks op.");
      setConfirmed(false); await onUpdated();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Resultaat onzeker. Controleer Chat."); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h3>Chat-melding controleren</h3><p>De aanvraag is opgeslagen. Een onbekend verzendresultaat kan betekenen dat de melding toch is bezorgd. Een verwerking die nog loopt kan na tien minuten worden herhaald.</p>
    <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/> Ik heb Chat gecontroleerd en wil deze melding opnieuw versturen.</label>
    <button type="button" className="button secondary" disabled={!confirmed || busy} onClick={() => void retry()}>Melding opnieuw versturen</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
