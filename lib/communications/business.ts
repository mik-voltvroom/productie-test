export type NotificationStatus = "pending" | "sent" | "failed" | "not_configured";

export function notificationOutcome(result: { configured: boolean; sent: number; failed: number }): NotificationStatus {
  if (!result.configured) return "not_configured";
  return result.sent > 0 && result.failed === 0 ? "sent" : "failed";
}

export function notificationWarning(lead: { channel: string; notification?: { status: NotificationStatus } }): string | null {
  switch (lead.notification?.status) {
    case "sent": return null;
    case "not_configured": return "Chat-melding niet verstuurd: koppeling ontbreekt. Volg deze lead op in VVOS.";
    case "failed": return "Chat-melding niet bevestigd. Volg deze lead op in VVOS.";
    case "pending": return "Chat-melding nog niet bevestigd. Controleer deze lead in VVOS.";
    default: return lead.channel === "website" ? "Chat-meldingsstatus onbekend (oudere aanvraag)." : null;
  }
}
