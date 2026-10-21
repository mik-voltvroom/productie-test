import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productionDataEnabled: vi.fn(), createServerDocument: vi.fn(), updateServerDocument: vi.fn(), consumePublicLeadQuota: vi.fn(),
}));
vi.mock("@/lib/repositories/server-collection", () => mocks);
vi.mock("@/lib/security/public-rate-limit", () => ({ consumePublicLeadQuota: mocks.consumePublicLeadQuota }));
vi.mock("@/lib/repositories/public-vehicle-repository", () => ({ getPublicVehicleById: vi.fn() }));
import { POST } from "@/app/api/leads/route";

const webhook = "https://chat.googleapis.com/v1/spaces/synthetic/messages?key=synthetic-secret";
const request = () => new Request("https://www.voltvroom.nl/api/leads", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Testpersoon", email: "test@example.com", channel: "website", message: "Synthetische test", consent: true, website: "" }),
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GOOGLE_CHAT_WEBHOOK_URL", webhook);
  mocks.productionDataEnabled.mockReturnValue(true);
  mocks.consumePublicLeadQuota.mockResolvedValue({ allowed: true });
  mocks.createServerDocument.mockImplementation(async (_collection, id, value) => ({ id, ...value }));
  mocks.updateServerDocument.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("saved website lead with real notification service and synthetic transport", () => {
  it.each(["missing", "http-failure", "network-failure", "timeout", "success"])("preserves exactly one stored lead for %s", async scenario => {
    if (scenario === "missing") vi.stubEnv("GOOGLE_CHAT_WEBHOOK_URL", "");
    if (scenario === "http-failure") vi.mocked(fetch).mockResolvedValue(new Response("private provider response", { status: 503 }));
    if (scenario === "network-failure") vi.mocked(fetch).mockRejectedValue(new Error(webhook));
    if (scenario === "timeout") vi.mocked(fetch).mockRejectedValue(new DOMException("private timeout details", "TimeoutError"));
    const response = await POST(request());
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.lead).not.toHaveProperty("notification");
    expect(mocks.createServerDocument).toHaveBeenCalledOnce();
    const [, id, saved] = mocks.createServerDocument.mock.calls[0];
    expect(saved.notification).toMatchObject({ status: "pending" });
    expect(body.lead.id).toBe(id);
    expect(mocks.updateServerDocument).toHaveBeenCalledExactlyOnceWith("leads", id, {
      notification: { status: scenario === "missing" ? "not_configured" : scenario === "success" ? "sent" : "failed", updatedAt: expect.any(String) },
    });
    expect(fetch).toHaveBeenCalledTimes(scenario === "missing" ? 0 : 1);
    if (scenario !== "missing") {
      expect(mocks.createServerDocument.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(fetch).mock.invocationCallOrder[0]);
      expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    }
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls);
    for (const value of ["test@example.com", "Testpersoon", "synthetic-secret", "private"]) expect(logs).not.toContain(value);
  });

  it("retains the durable pending warning if result persistence fails", async () => {
    mocks.updateServerDocument.mockRejectedValue(new Error("private Firestore details"));
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.createServerDocument).toHaveBeenCalledOnce();
    expect(mocks.createServerDocument.mock.calls[0][2].notification.status).toBe("pending");
    expect(fetch).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith("Lead notification status persistence failed", { operation: "recordLeadNotification" });
  });

  it("does not send or record a notification when lead storage fails", async () => {
    mocks.createServerDocument.mockRejectedValue(new Error("storage unavailable"));
    expect((await POST(request())).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.updateServerDocument).not.toHaveBeenCalled();
  });
});
