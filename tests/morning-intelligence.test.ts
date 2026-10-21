import { expect, it } from "vitest";
import { morningSnapshot, stockDays, amsterdamDay } from "@/lib/intelligence/business";
import type { Lead, Vehicle } from "@/types";
const now = new Date("2026-10-21T12:00:00Z");
it("uses Amsterdam days and never resets stock age from a general update", () => {
  expect(amsterdamDay("2026-10-20T23:30:00Z")).toBe("2026-10-21");
  expect(stockDays({ updatedAt: now.toISOString() } as Vehicle, now)).toBeNull();
  expect(stockDays({ commercial: { stockEnteredAt: "2026-08-21T12:00:00Z" }, updatedAt: now.toISOString() } as Vehicle, now)).toBe(61);
});
it("keeps unknown costs unknown and orders lead work by actual deadlines", () => {
  const vehicle = { status: "available", priceCents: 2000000, images: [] } as unknown as Vehicle;
  const base = { name: "Synthetic", channel: "website", consent: true } as Lead;
  const result = morningSnapshot([vehicle], [
    { ...base, id: "later", nextActionAt: "2026-10-21T11:00:00Z" },
    { ...base, id: "first", nextActionAt: "2026-10-20T11:00:00Z" },
    { ...base, id: "contacted", lastContactAt: "2026-10-21T10:00:00Z", sales: { responseDueAt: "2026-10-20T11:00:00Z" } as Lead["sales"] },
  ], now);
  expect(result.published).toBe(0);
  expect(result.expectedMarginCents).toBeNull();
  expect(result.missingCosts).toBe(1);
  expect(result.overdue.map(item => item.id)).toEqual(["first", "later"]);
});
