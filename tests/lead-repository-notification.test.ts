import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/config", () => ({ integrationMode: "firebase" }));
import { saveLead, listLeads } from "@/lib/repositories/lead-repository";
afterEach(() => vi.unstubAllGlobals());

it("does not overwrite server notification status when staff changes a lead", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true })); vi.stubGlobal("fetch", fetch);
  await saveLead({ id: "LEAD-test", name: "Synthetic", channel: "website", consent: true, status: "contacted", notification: { status: "pending", updatedAt: "2026-10-12T07:00:00Z" } });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ id: "LEAD-test", patch: { status: "contacted" } });
  expect(fetch.mock.calls[0][0]).toBe("/api/vvos/crm/leads");
});
it("propagates failed storage/auth without local demo fallback", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ ok: false, error: "Niet beschikbaar" }, { status: 503 })));
  await expect(listLeads()).rejects.toThrow("Niet beschikbaar");
  await expect(saveLead({ id: "LEAD-test", name: "Synthetic", channel: "website", consent: true, status: "contacted" })).rejects.toThrow("Niet beschikbaar");
});
