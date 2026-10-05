import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productionDataEnabled: vi.fn(),
  createServerDocument: vi.fn(),
  consumePublicLeadQuota: vi.fn(),
  sendLeadNotification: vi.fn(),
}));

vi.mock("@/lib/repositories/server-collection", () => ({
  productionDataEnabled: mocks.productionDataEnabled,
  createServerDocument: mocks.createServerDocument,
}));

vi.mock("@/lib/security/public-rate-limit", () => ({
  consumePublicLeadQuota: mocks.consumePublicLeadQuota,
}));

vi.mock("@/lib/communications/lead-notification", () => ({
  sendLeadNotification: mocks.sendLeadNotification,
}));

vi.mock("@/lib/repositories/public-vehicle-repository", () => ({
  getPublicVehicleById: vi.fn(),
}));

import { POST } from "@/app/api/leads/route";

function request(): Request {
  return new Request("https://www.voltvroom.nl/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Testpersoon",
      email: "test@example.com",
      channel: "website",
      message: "Ik wil graag meer informatie.",
      consent: true,
      website: "",
    }),
  });
}

describe("POST /api/leads notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productionDataEnabled.mockReturnValue(true);
    mocks.consumePublicLeadQuota.mockResolvedValue({ allowed: true });
    mocks.createServerDocument.mockImplementation(async (_collection, id, value) => ({ id, ...value }));
    mocks.sendLeadNotification.mockResolvedValue({ configured: true, sent: 2, failed: 0 });
  });

  it("verstuurt de interne alert pas nadat de lead is opgeslagen", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.createServerDocument).toHaveBeenCalledOnce();
    expect(mocks.sendLeadNotification).toHaveBeenCalledOnce();
    expect(mocks.createServerDocument.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.sendLeadNotification.mock.invocationCallOrder[0]);
  });

  it("behoudt een succesvolle opgeslagen aanvraag bij een Chat-webhookstoring", async () => {
    mocks.sendLeadNotification.mockRejectedValueOnce(new Error("provider unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(consoleError).toHaveBeenCalledWith("Lead notification incomplete", {
      operation: "sendLeadNotification",
      reason: "provider_failure",
      failed: 1,
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("test@example.com");
    consoleError.mockRestore();
  });
});
