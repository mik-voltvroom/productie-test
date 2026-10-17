import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/lib/repositories/public-vehicle-repository", () => ({ getPublicVehicleById: async (id: string) => (await mocks.list()).find((vehicle: { id: string }) => vehicle.id === id), PublicInventoryUnavailable: class extends Error {} }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
import Page from "../app/voertuigen/[id]/page";

const open = (id: string, query: Record<string, string | string[]> = {}) => Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve(query) });
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue([{ id: "hexon-123456", slug: "demo-auto" }]); });
describe("Mobilox landing links", () => {
  it("resolves the external stock ID and preserves store and ad attribution", async () => {
    await expect(open("123456", { store: "demo-store", gclid: "demo-click", tag: ["a", "b"] })).rejects.toThrow("REDIRECT /voorraad/demo-auto?store=demo-store&gclid=demo-click&tag=a&tag=b");
  });
  it("uses the current slug and encodes it as a single path segment", async () => {
    mocks.list.mockResolvedValue([{ id: "hexon-123456", slug: "new/slug" }]);
    await expect(open("123456")).rejects.toThrow("REDIRECT /voorraad/new%2Fslug");
  });
  it("returns not found when a vehicle is absent from public inventory", async () => {
    mocks.list.mockResolvedValue([]);
    await expect(open("123456")).rejects.toThrow("NOT_FOUND");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("does not match a different external ID", async () => {
    await expect(open("12345")).rejects.toThrow("NOT_FOUND");
  });
  it("rejects invalid IDs before reading inventory", async () => {
    await expect(open("invalid/path")).rejects.toThrow("NOT_FOUND");
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("fails closed if two public vehicles claim the same external ID", async () => {
    mocks.list.mockResolvedValue([{ id: "hexon-123456", slug: "a" }, { id: "123456", slug: "b" }]);
    await expect(open("123456")).rejects.toThrow(); expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
