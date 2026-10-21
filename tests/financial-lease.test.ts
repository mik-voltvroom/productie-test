import { describe, expect, it } from "vitest";
import { calculateLease, defaultSelection, eligibleForLease } from "@/lib/financial-lease/business";
import { leaseRate } from "@/lib/financial-lease/config";

describe("financial lease", () => {
  it("uses the approved 12.5 percent indicative rate", () => {
    expect(leaseRate()).toBe(1250);
  });

  it("repays principal and balloon at zero interest", () => {
    const quote = calculateLease(3_000_000, { termMonths: 60, downPaymentCents: 600_000, balloonCents: 600_000 }, 0);
    expect(quote.monthlyCents).toBe(30_000);
    expect(quote.totalCents).toBe(3_000_000);
  });

  it("calculates an indicative annuity with a final balloon", () => {
    const quote = calculateLease(3_199_000, { termMonths: 36, downPaymentCents: 1_000_000, balloonCents: 1_000_000 }, 1250);
    expect(quote.monthlyCents).toBe(50_528);
    expect(quote.finalMonthlyCents).toBeGreaterThan(0);
  });

  it("rejects overpayment and excessive balloon", () => {
    expect(() => calculateLease(10_000, { ...defaultSelection, downPaymentCents: 10_000 }, 1250)).toThrow();
    expect(() => calculateLease(10_000, { ...defaultSelection, balloonCents: 5_001 }, 1250)).toThrow();
  });

  it("validates vehicle eligibility", () => {
    expect(eligibleForLease({ status: "available", priceCents: 3_000_000 })).toBe(true);
    expect(eligibleForLease({ status: "sold", priceCents: 3_000_000 })).toBe(false);
  });
});
