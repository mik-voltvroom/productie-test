"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SyncEvent = {
  id: string;
  type: string;
  sourceVehicleId: string;
  receivedAt?: string | null;
  imageFailures?: Array<{ message: string }>;
  vehicleId?: string;
  vehicle?: {
    licensePlate?: string | null;
    brand?: string | null;
    model?: string | null;
    type?: string | null;
    syncStatus?: string | null;
  } | null;
};

function actionLabel(type: string) {
  if (type.endsWith(".add")) return "Toegevoegd";
  if (type.endsWith(".change")) return "Bijgewerkt";
  if (type.endsWith(".delete")) return "Verwijderd";
  return type;
}

export default function MobiloxSyncMonitorPage() {
  const [items, setItems] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/mobilox/events?limit=25", { cache: "no-store" });
      const data = await response.json().catch(() => ({ error: `Sync-events konden niet worden geladen (${response.status}).` }));
      if (!response.ok) throw new Error(data.error ?? "Sync-events konden niet worden geladen.");
      setItems(data.items ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 72px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#687280" }}>Integraties · Hexon / Mobilox</p>
          <h1 style={{ margin: 0, fontSize: 34, letterSpacing: "-.04em" }}>Sync Monitor</h1>
          <p style={{ margin: "10px 0 0", color: "#687280" }}>De laatste 25 voertuigmutaties die VVOS van Hexon heeft ontvangen, inclusief fotowaarschuwingen.</p>
        </div>
        <button onClick={() => void load()} style={{ border: "1px solid #dce3e8", background: "white", borderRadius: 10, padding: "10px 16px", cursor: "pointer" }}>Vernieuwen</button>
      </div>

      {error ? <div style={{ padding: 18, borderRadius: 12, background: "#fff3f2", marginBottom: 20 }}>{error}</div> : null}
      <div style={{ background: "white", border: "1px solid #e6ebef", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr 1fr 1fr .8fr", padding: "12px 18px", background: "#f7f9fb", color: "#687280", fontSize: 12, fontWeight: 600 }}>
          <span>Voertuig</span><span>Actie</span><span>Hexon ID</span><span>Ontvangen</span><span>Foto’s</span>
        </div>
        {loading ? <p style={{ padding: 24 }}>Sync-events laden…</p> : items.length === 0 ? <p style={{ padding: 24 }}>Nog geen Mobilox-events gevonden.</p> : items.map(item => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr 1fr 1fr .8fr", padding: "16px 18px", borderTop: "1px solid #edf1f4", alignItems: "center", gap: 12 }}>
            <div>
              <strong>{[item.vehicle?.brand, item.vehicle?.model].filter(Boolean).join(" ") || "Onbekend voertuig"}</strong>
              <div style={{ marginTop: 4, color: "#687280", fontSize: 13 }}>{item.vehicle?.licensePlate || "Geen kenteken"}{item.vehicle?.syncStatus ? ` · ${item.vehicle.syncStatus}` : ""}</div>
            </div>
            <span>{actionLabel(item.type)}</span>
            <span style={{ fontFamily: "monospace", fontSize: 13 }}>{item.sourceVehicleId || "—"}</span>
            <span>{item.receivedAt ? new Date(item.receivedAt).toLocaleString("nl-NL") : "—"}</span>
            <span style={{ color: item.imageFailures?.length ? "#a13b32" : "#276749", fontSize: 13 }}>
              {item.imageFailures?.length ? <><strong>{item.imageFailures.length} fout</strong><br />{item.imageFailures[0].message}</> : "Verwerkt"}
            </span>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 18, color: "#687280", fontSize: 13 }}>Ontbreekt een auto hier, dan heeft VVOS hem niet succesvol verwerkt. Staat dezelfde Hexon ID meerdere keren bij verschillende auto's, dan is dat direct zichtbaar in deze historie.</p>
      <div style={{ marginTop: 24 }}><Link href="/dashboard/voorraad">← Terug naar voorraad</Link></div>
    </main>
  );
}
