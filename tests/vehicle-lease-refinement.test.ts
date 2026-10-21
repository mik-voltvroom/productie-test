import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateLease, defaultSelection, vehicleLeaseDefaults } from "@/lib/financial-lease/business";
import { leaseRate } from "@/lib/financial-lease/config";
import { LeaseCalculator } from "@/components/financial-lease/LeaseCalculator";

describe("vehicle detail lease defaults", () => {
  it.each([2_000_000, 2_891_100, 10_000_000])("uses the requested selection at price %i", price => {
    const { selection, notice } = vehicleLeaseDefaults(price);
    expect(selection).toEqual({ termMonths: 72, downPaymentCents: 500_000, balloonCents: 1_000_000 });
    expect(notice).toBeUndefined();
    expect(calculateLease(price, selection, leaseRate()).monthlyCents).toBeGreaterThan(0);
  });

  it.each([100_000, 500_000, 1_500_000, 1_999_999])("explains the safe fallback at price %i", price => {
    const { selection, notice } = vehicleLeaseDefaults(price);
    expect(selection).toEqual({ termMonths: 72, downPaymentCents: 0, balloonCents: 0 });
    expect(notice).toContain("50%");
    expect(calculateLease(price, selection, leaseRate()).monthlyCents).toBeGreaterThan(0);
  });

  it("does not change general defaults or hide invalid rates/prices", () => {
    expect(defaultSelection).toEqual({ termMonths: 60, downPaymentCents: 0, balloonCents: 0 });
    expect(() => calculateLease(0, vehicleLeaseDefaults(0).selection, leaseRate())).toThrow();
    expect(() => calculateLease(2_891_100, vehicleLeaseDefaults(2_891_100).selection, 3001)).toThrow();
  });

  it("renders the real quote, visible conditions, editable initial values and disclaimer", () => {
    const defaults = vehicleLeaseDefaults(2_891_100);
    const html = renderToStaticMarkup(createElement(LeaseCalculator, {
      vehicleId: "test", priceCents: 2_891_100, annualRateBps: leaseRate(), compact: true,
      initialSelection: defaults.selection,
    }));
    const quote = calculateLease(2_891_100, defaults.selection, leaseRate());
    const amount = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(quote.monthlyCents / 100);
    expect(html).toContain(amount);
    expect(html).toContain("72 maanden ·");
    expect(html).toContain('value="5000"');
    expect(html).toContain('value="10000"');
    expect(html).toContain("geen offerte of kredietgoedkeuring");
    expect(html).toContain("Direct aanvragen");
  });

  it("renders the fallback explanation and keeps zero amounts blank", () => {
    const defaults = vehicleLeaseDefaults(1_000_000);
    const html = renderToStaticMarkup(createElement(LeaseCalculator, {
      vehicleId: "test", priceCents: 1_000_000, annualRateBps: leaseRate(), compact: true,
      initialSelection: defaults.selection, initialNotice: defaults.notice,
    }));
    expect(html).toContain(defaults.notice);
    expect(html.match(/value=""/g)).toHaveLength(2);
  });
});
