import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth:vi.fn(), get:vi.fn(), save:vi.fn() }));
vi.mock("@/lib/auth/api", () => ({ authorizeApi:mocks.auth }));
vi.mock("@/lib/repositories/soh-repository", () => ({ getVehicleSohReport:mocks.get, saveVehicleSohReport:mocks.save }));
import { GET, POST } from "@/app/api/vvos/vehicles/[id]/soh/route";
import { SohError } from "@/lib/soh/business";
const context = { params:Promise.resolve({ id:"car-1" }) };
const url = "https://example.test/api/vvos/vehicles/car-1/soh";
const input = { sohPercent:91, method:"Diagnostic", measuredAt:"2026-10-10", expectedVehicleUpdatedAt:"old", expectedRevision:0 };
const post = (body:unknown, origin:string | null = "https://example.test") => new Request(url, { method:"POST", headers:origin ? { origin } : {}, body:JSON.stringify(body) });
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.example.test"); vi.resetAllMocks(); mocks.auth.mockResolvedValue({ actor:{ uid:"staff", role:"sales", email:null } }); });
afterEach(() => vi.unstubAllEnvs());
describe("SOH API boundary", () => {
  it("saves behind a TLS-terminating proxy for the configured site origin", async () => {
    mocks.save.mockResolvedValue({ report:{ id:"report" }, revision:1 });
    const request = new Request("http://internal:8080/api/vvos/vehicles/car-1/soh", { method:"POST", headers:{ origin:"https://site.example.test", "sec-fetch-site":"same-origin" }, body:JSON.stringify(input) });
    expect((await POST(request, context)).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("car-1", input, expect.objectContaining({ uid:"staff" }));
  });
  it.each([GET, POST])("authorizes before accessing any report", async handler => {
    mocks.auth.mockResolvedValue({ response:new Response(null, { status:403 }), actor:null });
    expect((await handler(post(input), context)).status).toBe(403);
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("returns private noncached reports using read permission", async () => {
    mocks.get.mockResolvedValue({ report:null, revision:0 });
    const response = await GET(new Request(url), context);
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "vehicles.read");
  });
  it("rejects cross-origin/missing-origin changes, source injection and invalid IDs", async () => {
    expect((await POST(post(input, "https://evil.test"), context)).status).toBe(403);
    expect((await POST(post(input, null), context)).status).toBe(403);
    expect((await POST(post({ ...input, vehicle:{} }), context)).status).toBe(400);
    expect((await POST(post(input), { params:Promise.resolve({ id:"../car" }) })).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects malformed or oversized payloads", async () => {
    expect((await POST(new Request(url, { method:"POST", headers:{origin:"https://example.test"}, body:"{" }), context)).status).toBe(400);
    expect((await POST(post({ ...input, method:"a".repeat(4001) }), context)).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("uses dedicated write permission and the server actor", async () => {
    mocks.save.mockResolvedValue({ report:{ id:"report" }, revision:1 });
    const response = await POST(post(input), context);
    expect(response.status).toBe(200); expect((await response.json()).revision).toBe(1);
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "vehicles.soh.write");
    expect(mocks.save).toHaveBeenCalledWith("car-1", input, { uid:"staff", role:"sales", email:null });
  });
  it.each([400, 404, 409, 503])("preserves actionable repository error %s", async status => {
    mocks.save.mockRejectedValue(new SohError("Failure", status));
    expect((await POST(post(input), context)).status).toBe(status);
  });
});
