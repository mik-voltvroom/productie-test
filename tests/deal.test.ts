import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAcceptedDealSnapshot, buildDeal, buildDefaultDeliveryTasks, calculateDealTotalCents, canTransitionDeal, dealCreateSchema } from "@/lib/deal/model";
import { centsToEuros } from "@/lib/money";
import { eurosToCents } from "@/lib/money";
import { normalizeDealDocument } from "@/lib/deal/repository";
import { hasPermission } from "@/lib/auth/permissions";
import { vehicles } from "@/lib/sample-data";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const input = {
  leadId: "LEAD-1",
  vehicleId: "VV-1",
  customer: { name: "Test Klant", email: "test@example.nl" },
  salePriceCents: 2_500_000,
  tradeInCreditCents: 500_000,
  accessoriesCents: 75_000,
  deliveryPackageCents: 99_500,
  depositRequiredCents: 100_000,
};

describe("deal and delivery commercial core", () => {
  it("accepts only strict integer-eurocent input", () => {
    expect(dealCreateSchema.safeParse(input).success).toBe(true);
    expect(dealCreateSchema.safeParse({ ...input, salePriceCents: 12.5 }).success).toBe(false);
    expect(dealCreateSchema.safeParse({ ...input, salePriceEur: 25_000 }).success).toBe(false);
    expect(dealCreateSchema.safeParse({ ...input, clientTotalCents: 1 }).success).toBe(false);
    expect(dealCreateSchema.safeParse({ ...input, tradeInCreditCents: 9_000_000 }).success).toBe(false);
  });

  it("calculates the immutable commercial total server-side", () => {
    expect(calculateDealTotalCents(input)).toBe(2_174_500);
    const deal = buildDeal(dealCreateSchema.parse(input), new Date("2026-08-18T12:00:00.000Z"));
    expect(deal.totalCents).toBe(2_174_500);
    expect(deal).not.toHaveProperty("totalEur");
    expect(deal).not.toHaveProperty("portalToken");
  });

  it("creates a complete delivery checklist with stable relations", () => {
    const tasks = buildDefaultDeliveryTasks("DEAL-1");
    expect(tasks).toHaveLength(5);
    expect(tasks.every(task => task.dealId === "DEAL-1" && task.status === "todo")).toBe(true);
    expect(new Set(tasks.map(task => task.id)).size).toBe(tasks.length);
  });

  it("allows only explicit forward deal transitions and cancellation", () => {
    expect(canTransitionDeal("draft", "awaiting_signature")).toBe(true);
    expect(canTransitionDeal("draft", "cancelled")).toBe(true);
    expect(canTransitionDeal("draft", "delivered")).toBe(false);
    expect(canTransitionDeal("delivered", "preparation")).toBe(false);
  });

  it("separates commercial actions by role", () => {
    expect(hasPermission("sales", "deals.create")).toBe(true);
    expect(hasPermission("workshop", "deals.create")).toBe(false);
    expect(hasPermission("workshop", "delivery.write")).toBe(true);
    expect(hasPermission("marketing", "delivery.write")).toBe(false);
    expect(hasPermission("finance", "payments.create")).toBe(true);
  });

  it("converts cents only at the presentation boundary", () => {
    expect(centsToEuros(123_45)).toBe(123.45);
    expect(eurosToCents(123.45)).toBe(123_45);
    expect(() => centsToEuros(12.5)).toThrow("geheel aantal eurocenten");
  });

  it("normalizes legacy Firestore euro fields without retaining them", () => {
    const legacy = normalizeDealDocument("DEAL-legacy", {
      ...input,
      salePriceCents: undefined,
      salePriceEur: 25_000,
      tradeInCreditCents: undefined,
      tradeInCreditEur: 5_000,
      accessoriesCents: undefined,
      accessoriesEur: 750,
      deliveryPackageCents: undefined,
      deliveryPackageEur: 995,
      depositRequiredCents: undefined,
      depositRequiredEur: 1_000,
      totalEur: 21_745,
      status: "draft",
      financeStatus: "not_requested",
      registrationStatus: "not_started",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(legacy.salePriceCents).toBe(2_500_000);
    expect(legacy.totalCents).toBe(2_174_500);
    expect(legacy).not.toHaveProperty("salePriceEur");
    expect(legacy).not.toHaveProperty("totalEur");
  });

  it("creates a minimized immutable acceptance snapshot", () => {
    const deal = buildDeal(dealCreateSchema.parse(input), new Date("2026-08-18T12:00:00.000Z"));
    deal.customer.dateOfBirth = "1990-01-01";
    (deal.customer as unknown as Record<string, unknown>).internalNote = "niet kopiëren";
    const snapshot = buildAcceptedDealSnapshot(deal, vehicles[0], new Date("2026-08-18T13:00:00.000Z"));
    expect(snapshot.id).toBe(`ACCEPTED-${deal.id}`);
    expect(snapshot.commercial.totalCents).toBe(deal.totalCents);
    expect(snapshot.vehicle.id).toBe(vehicles[0].id);
    expect(snapshot.customer).not.toHaveProperty("dateOfBirth");
    expect(snapshot.customer).not.toHaveProperty("internalNote");
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("reserves and sells vehicles only inside the deal transaction boundary", () => {
    const repository = read("lib/deal/repository.ts");
    const rules = read("firestore.rules");
    expect(repository).toContain('nextStatus === "signed"');
    expect(repository).toContain('status: "reserved", reservedDealId: deal.id');
    expect(repository).toContain('transaction.create(db.collection("dealSnapshots")');
    expect(repository).toContain('vehicle.reservedDealId !== deal.id');
    expect(repository).toContain('status: "sold"');
    expect(repository).toContain("soldPriceCents: deal.salePriceCents");
    expect(repository).toContain('recordVehiclePrice(vehicle.commercial, deal.salePriceCents, updatedAt, "deal")');
    expect(rules).toContain("match /dealSnapshots/{snapshotId} { allow read, write: if false; }");
  });
});
