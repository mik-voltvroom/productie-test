export type IntegrationHealthState = "healthy" | "degraded" | "unconfigured" | "configured";

export interface IntegrationHealth {
  key: string;
  label: string;
  state: IntegrationHealthState;
  configured: boolean;
  latencyMs?: number;
  checkedAt: string;
  message: string;
}

async function timedCheck(url: string, init?: RequestInit): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    return { ok: response.ok, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getIntegrationHealth(runRemoteChecks = false): Promise<IntegrationHealth[]> {
  const checkedAt = new Date().toISOString();
  const definitions = [
    { key: "firebase", label: "Firebase", configured: Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) },
    { key: "rdw", label: "RDW voertuigdata", configured: Boolean(process.env.RDW_API_BASE_URL), url: process.env.RDW_HEALTH_URL },
    { key: "mobilox", label: "Mobilox / Hexon voorraadfeed", configured: Boolean(process.env.HEXON_SYNC_USERNAME && process.env.HEXON_SYNC_PASSWORD) },
    { key: "merchant", label: "Google Merchant Center", configured: Boolean(process.env.GOOGLE_MERCHANT_ID && process.env.GOOGLE_MERCHANT_DATASOURCE) },
    { key: "whatsapp", label: "WhatsApp Business", configured: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_TOKEN), url: process.env.WHATSAPP_HEALTH_URL },
    { key: "email", label: "E-mail", configured: Boolean(process.env.EMAIL_API_URL && process.env.EMAIL_API_KEY), url: process.env.EMAIL_HEALTH_URL },
    { key: "payments", label: "Betalingen", configured: Boolean(process.env.MOLLIE_API_KEY || process.env.STRIPE_SECRET_KEY) },
  ];

  return Promise.all(definitions.map(async (item): Promise<IntegrationHealth> => {
    if (!item.configured) return { key: item.key, label: item.label, configured: false, state: "unconfigured", checkedAt, message: "Nog niet geconfigureerd." };
    if (item.key === "mobilox") return { key: item.key, label: item.label, configured: true, state: "configured", checkedAt, message: "Ontvanger geconfigureerd op /api/hexon/inventory. Dit bevestigt geen recente aanlevering; controleer de Mobilox-events." };
    if (!runRemoteChecks || !item.url) return { key: item.key, label: item.label, configured: true, state: "healthy", checkedAt, message: "Configuratie aanwezig; remote controle niet uitgevoerd." };
    const result = await timedCheck(item.url);
    return {
      key: item.key,
      label: item.label,
      configured: true,
      state: result.ok ? "healthy" : "degraded",
      latencyMs: result.latencyMs,
      checkedAt,
      message: result.ok ? "Provider bereikbaar." : "Provider niet bereikbaar binnen de controletermijn.",
    };
  }));
}
