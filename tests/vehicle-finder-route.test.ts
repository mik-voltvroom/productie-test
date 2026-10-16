import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Vehicle } from "@/types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ inventory: vi.fn() }));
vi.mock("@/lib/repositories/public-vehicle-repository", () => ({ listPublicVehicles: mocks.inventory }));
import { POST } from "@/app/api/vehicle-finder/route";

const publicVehicle = {
  id: "HEXON-123",
  slug: "volvo-xc40-recharge",
  brand: "Volvo",
  model: "XC40",
  trim: "Recharge",
  year: 2023,
  mileageKm: 31_000,
  priceCents: 3_990_000,
  driveType: "electric",
  fuelType: "Elektrisch",
  transmission: "Automaat",
  bodyStyle: "SUV",
  color: "Blauw",
  maintenanceHistory: "complete",
  images: ["https://example.test/volvo.jpg"],
  highlights: [],
  status: "available",
  locationCode: "GRONINGEN",
  wltpRangeKm: 418,
  updatedAt: "2026-10-16T08:00:00.000Z",
} satisfies Vehicle;

const payload = { budget: "30000-45000", annualKm: "10000-20000", charging: "home", usage: "commute", preference: "electric" };
const request = (body: unknown) => new Request("http://localhost/api/vehicle-finder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.inventory.mockResolvedValue([publicVehicle]);
});

describe("voertuigkeuzehulp-route", () => {
  it("matcht server-side tegen de bestaande openbare voorraadrepository", async () => {
    const response = await POST(request(payload));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.inventory).toHaveBeenCalledWith(100);
    expect(body.results).toEqual([expect.objectContaining({ id: "HEXON-123", wltpRangeKm: 418, reasons: expect.any(Array) })]);
    expect(JSON.stringify(body)).not.toContain("licensePlate");
    expect(JSON.stringify(body)).not.toContain("vin");
  });

  it("weigert ongeldige of extra invoer voordat voorraad wordt gelezen", async () => {
    const response = await POST(request({ ...payload, preference: "diesel", email: "test@example.test" }));
    expect(response.status).toBe(400);
    expect(mocks.inventory).not.toHaveBeenCalled();
  });

  it("geeft een lege maar geldige selectie zonder fictieve auto's", async () => {
    mocks.inventory.mockResolvedValue([]);
    const response = await POST(request(payload));
    expect(response.status).toBe(200);
    expect((await response.json()).results).toEqual([]);
  });

  it("geeft een veilige fout wanneer de actuele voorraad niet beschikbaar is", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.inventory.mockRejectedValue(new Error("Private provider detail"));
    const response = await POST(request(payload));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Private provider detail");
    expect(log).toHaveBeenCalledOnce();
  });
});
