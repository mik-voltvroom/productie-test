import { describe, expect, it } from "vitest";
import { calculateLease, configuredRate, defaultSelection, eligibleForLease } from "@/lib/financial-lease/business";

describe("financial lease", () => {
  it("repays principal and balloon at zero interest", () => {
    const quote = calculateLease(3_000_000, { termMonths: 60, downPaymentCents: 600_000, balloonCents: 600_000 }, 0);
    expect(quote.monthlyCents).toBe(30_000);
    expect(quote.totalCents).toBe(3_000_000);
  });

  it("calculates an indicative annuity with a final balloon", () => {
    const quote = calculateLease(3_199_000, { termMonths: 36, downPaymentCents: 1_000_000, balloonCents: 1_000_000 }, 850);
    expect(quote.monthlyCents).toBeGreaterThan(35_000);
    expect(quote.monthlyCents).toBeLessThan(50_000);
    expect(quote.finalMonthlyCents).toBeGreaterThan(0);
  });

  it("rejects overpayment and excessive balloon", () => {
    expect(() => calculateLease(10_000, { ...defaultSelection, downPaymentCents: 10_000 }, 850)).toThrow();
    expect(() => calculateLease(10_000, { ...defaultSelection, balloonCents: 5_001 }, 850)).toThrow();
  });

  it("validates rate configuration and vehicle eligibility", () => {
    expect(configuredRate("850")).toBe(850);
    expect(configuredRate("8.5")).toBeNull();
    expect(eligibleForLease({ status: "available", priceCents: 3_000_000 })).toBe(true);
    expect(eligibleForLease({ status: "sold", priceCents: 3_000_000 })).toBe(false);
  });
});
