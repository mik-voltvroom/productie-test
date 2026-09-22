import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/api", () => ({ authorizeApi: mocks.authorize }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/repositories/vehicle-editorial-repository", () => ({ updateVehicleEditorial: mocks.update }));
import { PATCH } from "@/app/api/vvos/vehicles/[id]/editorial/route";
import { EditorialConflict } from "@/lib/vehicle/editorial";
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
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects unknown fields and cross-origin writes", async () => {
    expect((await PATCH(request({ type: "options", keys: [], revision: 0, status: "sold" }), context)).status).toBe(400);
    expect((await PATCH(request({ type: "options", keys: [], revision: 0 }, "https://other.test"), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("reports conflicts without claiming success", async () => {
    mocks.update.mockRejectedValue(new EditorialConflict("Herlaad het dossier."));
    const response = await PATCH(request({ type: "options", keys: [], revision: 0 }), context);
    expect(response.status).toBe(409);
    expect((await response.json()).ok).toBe(false);
  });
  it("returns the committed vehicle", async () => {
    mocks.update.mockResolvedValue({ id: "hexon-123", editorial: { revision: 1 } });
    const response = await PATCH(request({ type: "options", keys: [], revision: 0 }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).vehicle.editorial.revision).toBe(1);
  });
});
