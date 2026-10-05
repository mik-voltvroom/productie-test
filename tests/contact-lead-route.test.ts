import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ enabled: vi.fn(), save: vi.fn(), inventory: vi.fn(), quota: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/repositories/server-collection", () => ({ productionDataEnabled: mocks.enabled, createServerDocument: mocks.save }));
vi.mock("@/lib/repositories/public-vehicle-repository", () => ({ getPublicVehicleById: mocks.inventory }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumePublicLeadQuota: mocks.quota }));
vi.mock("@/lib/communications/lead-notification", () => ({ sendLeadNotification: mocks.notify }));
import { POST } from "@/app/api/leads/route";

const general = { name: " Test Aanvrager ", email: "test@example.com", consent: true, website: "" };
const drive = { ...general, vehicleId: "HEXON-123", interest: "Proefrit plannen", preferredContact: "email", testDrive: { preferredDate: "2026-10-12", daypart: "afternoon" } };
const request = (payload: unknown) => new Request("http://localhost/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T10:00:00Z"));
  mocks.enabled.mockReturnValue(true);
  mocks.quota.mockResolvedValue({ allowed: true });
  mocks.inventory.mockImplementation(async id => id === "HEXON-123" ? { id, brand: "Volvo", model: "XC40", trim: "Recharge" } : undefined);
  mocks.notify.mockResolvedValue({ configured: true, sent: 1, failed: 0 });
  mocks.save.mockImplementation(async (_collection, id, data) => ({ ...data, id }));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("publieke contactleadroute (uitsluitend gemockte opslag en notificaties)", () => {
  it("bewaart ID, betrouwbare titel en proefritvoorkeur bij de bestaande lead", async () => {
    const response = await POST(request({ ...drive, vehicleTitle: "Door bezoeker vervalste titel" }));
    expect(response.status).toBe(201);
    expect((await response.json()).ok).toBe(true);
    expect(mocks.save).toHaveBeenCalledOnce();
    const [collection, id, data] = mocks.save.mock.calls[0];
    expect(collection).toBe("leads");
    expect(id).toMatch(/^LEAD-/);
    expect(data).toMatchObject({ name: "Test Aanvrager", vehicleId: "HEXON-123", vehicleTitle: "Volvo XC40 Recharge", interest: "Proefrit plannen", preferredContact: "email", testDrive: drive.testDrive, status: "new" });
    expect(data.message).toContain("2026-10-12, Middag");
    expect(data.message).not.toContain("vervalste");
    expect(data.sales.reasons).toContain("Hoge koopintentie in bericht");
    expect(data).not.toHaveProperty("website");
    expect(data).not.toHaveProperty("phone");
    expect(JSON.stringify(data)).not.toContain("confirmed");
    expect(mocks.inventory).toHaveBeenCalledWith("HEXON-123");
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ id, message: data.message }));
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.notify.mock.invocationCallOrder[0]);
  });
  it.each([{ ...general, interest: "Adviesgesprek", vehicleId: "" }, { ...general, budgetEur: 30000, message: "Hybrid & EV Match", hasTradeIn: true }])("bewaart algemeen contact en bestaande keuzehulp zonder voorraadlookup", async payload => {
    expect((await POST(request(payload))).status).toBe(201);
    expect(mocks.inventory).not.toHaveBeenCalled();
    const data = mocks.save.mock.calls[0][2];
    expect(data).not.toHaveProperty("vehicleId");
    expect(data).not.toHaveProperty("testDrive");
    expect(Object.values(data)).not.toContain(undefined);
  });
  it("neemt voertuigcontext mee bij een normale voorraadvraag", async () => {
    expect((await POST(request({ ...general, vehicleId: "HEXON-123", interest: "Vraag over voorraad", message: "Heeft hij een trekhaak?" }))).status).toBe(201);
    expect(mocks.save.mock.calls[0][2].message).toContain("Volvo XC40 Recharge");
  });
  it.each(["deleted", "unpublished", "unknown"])("weigert een niet-publiek of verwijderd ID: %s", async vehicleId => {
    const response = await POST(request({ ...drive, vehicleId }));
    expect(response.status).toBe(400);
    expect((await response.json()).errors.fieldErrors.vehicleId).toBeDefined();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("controleert opnieuw wanneer de auto na het openen van het formulier is verwijderd", async () => {
    mocks.inventory.mockResolvedValue(undefined);
    expect((await POST(request(drive))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it.each([{ ...drive, vehicleId: "" }, { ...drive, vehicleId: "../private" }, { ...drive, testDrive: undefined }, { ...drive, testDrive: { preferredDate: "2026-10-04", daypart: "morning" } }, { ...general, consent: false }, { ...general, email: "bad" }, { ...general, website: "spam" }, null])("valideert ook zonder de browser: %j", async payload => {
    expect((await POST(request(payload))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("weigert onleesbare JSON", async () => {
    const response = await POST(new Request("http://localhost/api/leads", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("geeft de volledige veldnaam terug voor een ongeldig proefritmoment", async () => {
    const response = await POST(request({ ...drive, testDrive: { preferredDate: "2026-02-30", daypart: "afternoon" } }));
    expect(response.status).toBe(400);
    expect((await response.json()).errors.fieldErrors["testDrive.preferredDate"]).toContain("Kies een geldige datum.");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("behoudt het expliciete algemene aanvraagtype", async () => {
    expect((await POST(request({ ...general, type: "general" }))).status).toBe(201);
    expect(mocks.save.mock.calls[0][2].type).toBe("general");
    expect(mocks.inventory).not.toHaveBeenCalled();
  });
  it.each(["unsupported", 1, null])("weigert een ongeldige leadroute zonder opslag: %j", async type => {
    expect((await POST(request({ ...general, type }))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("claimt geen succes zonder opslagconfiguratie", async () => {
    mocks.enabled.mockReturnValue(false);
    expect((await POST(request(general))).status).toBe(503);
    expect(mocks.quota).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("behoudt de rate limit en Retry-After", async () => {
    mocks.quota.mockResolvedValue({ allowed: false, retryAfterSeconds: 45 });
    const response = await POST(request(drive));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it.each(["save", "inventory", "quota"] as const)("geeft veilige foutinformatie bij een %s-fout", async operation => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks[operation].mockRejectedValue(new Error("Private provider details test@example.com"));
    const response = await POST(request(drive));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Private provider");
    expect(JSON.stringify(log.mock.calls)).not.toContain("test@example.com");
  });
});
