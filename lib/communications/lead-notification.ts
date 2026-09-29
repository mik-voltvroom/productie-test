type LeadNotification = {
  id: string;
  kind: "lead" | "trade-in";
  name: string;
  email?: string;
  phone?: string;
  channel: string;
  message?: string;
  createdAt: string;
};

export type LeadNotificationResult = {
  configured: boolean;
  sent: number;
  failed: number;
};

export async function sendLeadNotification(lead: LeadNotification): Promise<LeadNotificationResult> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) return { configured: false, sent: 0, failed: 0 };

  const title = lead.kind === "trade-in"
    ? "Nieuwe inruilaanvraag via voltvroom.nl"
    : "Nieuwe lead via voltvroom.nl";
  const text = [
    `*${title}*`,
    `Naam: ${lead.name}`,
    `E-mail: ${lead.email || "Niet opgegeven"}`,
    `Telefoon: ${lead.phone || "Niet opgegeven"}`,
    `Kanaal: ${lead.channel}`,
    `Ontvangen: ${lead.createdAt}`,
    `Leadnummer: ${lead.id}`,
    "",
    lead.message || "Geen toelichting opgegeven.",
  ].join("\n");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ text }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) return { configured: true, sent: 0, failed: 1 };
  return { configured: true, sent: 1, failed: 0 };
}
