import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verifySessionCookie: vi.fn() }));
vi.mock("@/lib/firebase-admin", () => ({ adminAuth: mocks }));
import { authorizeApi } from "@/lib/auth/api";
beforeEach(() => { vi.stubEnv("VVOS_ENV", "production"); vi.stubEnv("VVOS_REQUIRE_AUTH", "false"); mocks.verifySessionCookie.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
describe("session and mutation boundary", () => {
  it("denies a missing or unrecognized staff role", async () => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: "synthetic" });
    expect((await authorizeApi(new Request("https://www.voltvroom.nl", { headers: { cookie: "vvos_session=valid" } }), "leads.read")).response?.status).toBe(403);
  });
  it("denies a cookie without a valid signed, nonrevoked session", async () => {
    mocks.verifySessionCookie.mockRejectedValue(new Error("revoked"));
    const result = await authorizeApi(new Request("https://www.voltvroom.nl/api/private", { headers: { cookie: "vvos_session=forged" } }), "leads.read");
    expect(result.response?.status).toBe(401);
    expect(mocks.verifySessionCookie).toHaveBeenCalledWith("forged", true);
  });
  it("handles malformed cookie encoding without a server exception", async () => {
    expect((await authorizeApi(new Request("https://www.voltvroom.nl", { headers: { cookie: "vvos_session=%zz" } }), "leads.read")).response?.status).toBe(401);
  });
  it.each([undefined, "https://attacker.invalid"])("rejects mutation origin %s", async origin => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: "synthetic", role: "owner" });
    const result = await authorizeApi(new Request("https://www.voltvroom.nl/api/private", { method: "POST", headers: { cookie: "vvos_session=valid", ...(origin ? { origin } : {}) } }), "leads.write");
    expect(result.response?.status).toBe(403);
  });
  it("allows a valid sales mutation from the configured origin", async () => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: "synthetic", role: "sales" });
    expect((await authorizeApi(new Request("https://www.voltvroom.nl/api/private", { method: "POST", headers: { cookie: "vvos_session=valid", origin: "https://www.voltvroom.nl" } }), "leads.write")).actor?.role).toBe("sales");
  });
  it("does not give workshop lead rights", async () => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: "synthetic", role: "workshop" });
    expect((await authorizeApi(new Request("https://www.voltvroom.nl/api/private", { headers: { cookie: "vvos_session=valid" } }), "leads.read")).response?.status).toBe(403);
  });
});
