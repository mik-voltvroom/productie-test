import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("@/lib/auth/api", () => ({ authorizeApi: mocks.authorize }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { PATCH } from "@/app/api/vvos/vehicles/[id]/editorial/route";
const context = { params: Promise.resolve({ id: "hexon-123" }) };
function request(body: unknown, origin = "https://www.voltvroom.nl") {
  return new Request("https://www.voltvroom.nl/api/vvos/vehicles/hexon-123/editorial", { method: "PATCH", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.resetAllMocks(); mocks.authorize.mockResolvedValue({ actor: { uid: "test", email: null, role: "owner" } }); });
describe("editorial API boundary", () => {
  it("authorizes before touching the repository", async () => {
    mocks.authorize.mockResolvedValue({ actor: null, response: new Response(null, { status: 403 }) });
    expect((await PATCH(request({ type: "options", keys: [], revision: 0 }), context)).status).toBe(403);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(Request), "vehicles.write");
  });
  it("rejects unknown fields and cross-origin writes", async () => {
    expect((await PATCH(request({ type: "options", keys: [], revision: 0, status: "sold" }), context)).status).toBe(400);
    expect((await PATCH(request({ type: "options", keys: [], revision: 0 }, "https://other.test"), context)).status).toBe(403);
  });
  it.each([
    { type: "text", text: "override", revision: 0 },
    { type: "options", keys: [], revision: 0 },
    { type: "add", url: "https://example.test/manual.jpg", revision: 0 },
    { type: "delete", id: "photo", revision: 0 },
    { type: "reorder", ids: ["photo"], revision: 0 },
    { type: "visibility", id: "photo", online: false, revision: 0 },
    { type: "addOption", label: "Manual option", revision: 0 },
  ])("rejects $type through the real repository boundary", async command => {
    const response = await PATCH(request(command), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: expect.stringContaining("Mobilox") });
  });
});
