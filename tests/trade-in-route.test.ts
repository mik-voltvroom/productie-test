import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  persistTradeInRequest: vi.fn(),
  consumePublicLeadQuota: vi.fn(),
  sendLeadNotification: vi.fn(),
}));

vi.mock("@/lib/repositories/trade-in-repository", () => {
  class TradeInPersistenceUnavailableError extends Error {}
  return {
    persistTradeInRequest: mocks.persistTradeInRequest,
    TradeInPersistenceUnavailableError,
  };
});

vi.mock("@/lib/security/public-rate-limit", () => ({
  consumePublicLeadQuota: mocks.consumePublicLeadQuota,
}));

vi.mock("@/lib/communications/lead-notification", () => ({
  sendLeadNotification: mocks.sendLeadNotification,
}));

import { POST } from "@/app/api/trade-ins/route";

function validForm(overrides: Record<string, string> = {}): FormData {
  const values = {
    licensePlate: "AB-12-CD",
    mileageKm: "85000",
    brand: "Volvo",
    model: "XC40",
    condition: "good",
    maintenanceHistory: "complete",
    keys: "two",
    name: "Testpersoon",
    email: "test@example.com",
    phone: "0612345678",
    contactPreference: "phone",
    consent: "on",
    website: "",
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

function submit(form: FormData): Promise<Response> {
  return POST(new Request("https://www.voltvroom.nl/api/trade-ins", { method: "POST", body: form }));
}

describe("POST /api/trade-ins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumePublicLeadQuota.mockResolvedValue({ allowed: true });
    mocks.persistTradeInRequest.mockResolvedValue({ photoPaths: [] });
    mocks.sendLeadNotification.mockResolvedValue({ configured: true, sent: 2, failed: 0 });
  });

  it.each([
    ["zonder gewenste auto", {}],
    ["zonder schade en opties", { damage: "", options: "" }],
    ["met alleen telefoon", { email: "", phone: "0612345678", contactPreference: "phone" }],
    ["met alleen e-mailadres", { email: "test@example.com", phone: "", contactPreference: "email" }],
  ])("slaat een geldige aanvraag %s op", async (_scenario, overrides) => {
    const response = await submit(validForm(overrides));

    expect(response.status).toBe(201);
    expect(mocks.persistTradeInRequest).toHaveBeenCalledOnce();
    expect(mocks.sendLeadNotification).toHaveBeenCalledOnce();
  });

  it("ondersteunt aanvragen zonder en met privéfoto's", async () => {
    const withoutPhotos = await submit(validForm());
    expect(withoutPhotos.status).toBe(201);
    expect(mocks.persistTradeInRequest.mock.calls[0][0].photos).toEqual([]);

    const form = validForm();
    form.append("photos", new File(["photo"], "auto.jpg", { type: "image/jpeg" }));
    mocks.persistTradeInRequest.mockResolvedValueOnce({ photoPaths: ["trade-ins/INR-test/photo.jpg"] });

    const withPhotos = await submit(form);
    expect(withPhotos.status).toBe(201);
    expect(mocks.persistTradeInRequest.mock.calls[1][0].photos).toHaveLength(1);
    expect(await withPhotos.json()).toMatchObject({ uploadedPhotos: 1 });
  });

  it("bewaart geldige optionele waarden", async () => {
    const response = await submit(validForm({
      year: "2022",
      damage: "Kleine kras rechtsachter",
      options: "Warmtepomp en trekhaak",
      desiredVehicleId: "VV-123",
      desiredVehicleLabel: "Volvo EX30",
    }));

    expect(response.status).toBe(201);
    const input = mocks.persistTradeInRequest.mock.calls[0][0];
    expect(input.lead.vehicleId).toBe("VV-123");
    expect(input.tradeIn).toMatchObject({
      year: 2022,
      damage: "Kleine kras rechtsachter",
      options: "Warmtepomp en trekhaak",
      desiredVehicleId: "VV-123",
    });
  });

  it("weigert ongeldige invoer met 400 zonder opslagpoging", async () => {
    const response = await submit(validForm({ email: "", phone: "" }));

    expect(response.status).toBe(400);
    expect(mocks.persistTradeInRequest).not.toHaveBeenCalled();
  });

  it("geeft bij opslagfouten een veilige 500 zonder persoonsgegevens of techniek", async () => {
    mocks.persistTradeInRequest.mockRejectedValueOnce(new Error("Firestore undefined for test@example.com"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await submit(validForm());
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).toContain("0646585468");
    expect(body).not.toContain("Firestore");
    expect(body).not.toContain("undefined");
    expect(body).not.toContain("test@example.com");
    expect(consoleError).toHaveBeenCalledWith("Trade-in persistence failed", {
      operation: "persistTradeInRequest",
      errorName: "Error",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("test@example.com");
    consoleError.mockRestore();
  });
});
