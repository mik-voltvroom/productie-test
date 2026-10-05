import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  enabled: vi.fn(),
  quota: vi.fn(),
  vehicle: vi.fn(),
  rate: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/repositories/server-collection", () => ({ createServerDocument: mocks.create, productionDataEnabled: mocks.enabled }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumePublicLeadQuota: mocks.quota }));
vi.mock("@/lib/repositories/public-vehicle-repository", () => ({ getPublicVehicleById: mocks.vehicle }));
vi.mock("@/lib/financial-lease/config", () => ({ leaseRate: mocks.rate }));
vi.mock("@/lib/communications/lead-notification", () => ({ sendLeadNotification: mocks.notify }));

import { POST } from "@/app/api/leads/route";

const body = {
  type: "financial_lease",
  vehicleId: "car-1",
  expectedPriceCents: 3_000_000,
  expectedAnnualRateBps: 1250,
  companyName: "Voorbeeld BV",
  kvk: "12345678",
  name: "Test Aanvrager",
  email: "test@example.com",
  phone: "0612345678",
  consent: true,
  website: "",
  leaseSelection: { termMonths: 60, downPaymentCents: 0, balloonCents: 0 },
};

const send = (value: unknown) => POST(new Request("http://localhost/api/leads", { method: "POST", body: JSON.stringify(value) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled.mockReturnValue(true);
  mocks.quota.mockResolvedValue({ allowed: true });
  mocks.rate.mockReturnValue(1250);
  mocks.vehicle.mockResolvedValue({ id: "car-1", status: "available", priceCents: 3_000_000, brand: "Test", model: "Auto", trim: "" });
  mocks.create.mockImplementation(async (_collection, id, lead) => ({ id, ...lead }));
  mocks.notify.mockResolvedValue({ configured: true, sent: 1, failed: 0 });
});

describe("financial lease intake", () => {
  it("stores a server-calculated quote without echoing customer data", async () => {
    const response = await send({ ...body, monthlyCents: 1 });
    expect(response.status).toBe(201);
    const lead = mocks.create.mock.calls[0][2];
    expect(lead.type).toBe("financial_lease");
    expect(lead.companyName).toBe(body.companyName);
    expect(lead.kvk).toBe(body.kvk);
    expect(lead.financialLease.quote.annualRateBps).toBe(1250);
    expect(lead.financialLease.quote.monthlyCents).toBeGreaterThan(0);
    expect(lead.financialLease.providerStatus).toBe("not_submitted");
    expect((await response.json()).lead).toBeUndefined();
    expect(mocks.notify).toHaveBeenCalledOnce();
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.notify.mock.invocationCallOrder[0]);
  });

  it.each([{ kvk: "123" }, { companyName: " " }, { email: "wrong" }, { consent: false }])("rejects invalid input %j", async patch => {
    expect((await send({ ...body, ...patch })).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects stale prices and rates", async () => {
    expect((await send({ ...body, expectedPriceCents: 2_990_000 })).status).toBe(409);
    mocks.rate.mockReturnValue(900);
    expect((await send(body)).status).toBe(409);
  });

  it("does not simulate success when persistence fails", async () => {
    mocks.create.mockRejectedValue(new Error("offline"));
    expect((await send(body)).status).toBe(503);
  });
});
