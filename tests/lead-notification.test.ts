import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendLeadNotification } from "@/lib/communications/lead-notification";

const originalWebhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;

const lead = {
  id: "LEAD-test",
  kind: "trade-in" as const,
  name: "Testpersoon",
  email: "test@example.com",
  phone: "0612345678",
  channel: "website",
  message: "Inruilaanvraag voor een testauto.",
  createdAt: "2026-09-29T10:00:00.000Z",
};

describe("sendLeadNotification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CHAT_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/test/messages?key=test&token=test";
  });

  afterEach(() => {
    if (originalWebhookUrl === undefined) delete process.env.GOOGLE_CHAT_WEBHOOK_URL;
    else process.env.GOOGLE_CHAT_WEBHOOK_URL = originalWebhookUrl;
  });

  it("stuurt één alert naar de besloten Google Chat-ruimte", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const result = await sendLeadNotification(lead);

    expect(result).toEqual({ configured: true, sent: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      process.env.GOOGLE_CHAT_WEBHOOK_URL,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
      }),
    );
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.text).toContain("Nieuwe inruilaanvraag via voltvroom.nl");
    expect(payload.text).toContain("Testpersoon");
    expect(payload.text).toContain("test@example.com");
  });

  it("doet geen netwerkverzoek wanneer de provider niet is geconfigureerd", async () => {
    delete process.env.GOOGLE_CHAT_WEBHOOK_URL;
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(sendLeadNotification(lead)).resolves.toEqual({ configured: false, sent: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rapporteert een webhookfout zonder de opgeslagen lead te laten mislukken", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(sendLeadNotification(lead)).resolves.toEqual({ configured: true, sent: 0, failed: 1 });
  });
});
