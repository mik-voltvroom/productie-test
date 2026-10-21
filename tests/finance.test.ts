import { describe, expect, it } from "vitest";
import { agedReceivables, invoiceOpenAmount, invoiceTotals, vehicleProfit, vatBreakdown } from "@/lib/finance/business";
import type { Invoice, InvoiceLine } from "@/types";
import { normalizeBankTransactionDocument, normalizeInvoiceDocument, normalizeLedgerEntryDocument } from "@/lib/finance/money";

const lines: InvoiceLine[] = [
  { id: "1", description: "Onderhoud", quantity: 2, unitPriceCents: 10000, vatPercent: 21 },
  { id: "2", description: "APK", quantity: 1, unitPriceCents: 5000, vatPercent: 0 },
];

describe("finance rules", () => {
  it("calculates invoice and VAT totals", () => {
    expect(invoiceTotals(lines)).toEqual({ subtotalCents: 25000, vatCents: 4200, totalCents: 29200 });
    expect(vatBreakdown(lines)).toHaveLength(2);
  });

  it("never returns a negative open amount", () => {
    const invoice = { totalCents: 10000, paidCents: 12500 } as Invoice;
    expect(invoiceOpenAmount(invoice)).toBe(0);
  });

  it("calculates true vehicle contribution", () => {
    const result = vehicleProfit({
      vehicleId: "VV-1", vehicleLabel: "Toyota Corolla", salePriceEur: 25000, purchasePriceEur: 20000,
      directCostsEur: 1000, financeCostsEur: 200, warrantyProvisionEur: 300, tradeInMarginEur: 500,
      upsellMarginEur: 400, stockDays: 30,
    });
    expect(result.grossContributionEur).toBe(4400);
    expect(result.contributionPercent).toBe(17.6);
  });

  it("ages receivables into the right bucket", () => {
    const now = new Date("2026-07-14T12:00:00Z");
    const invoice = { kind: "sales", status: "sent", totalCents: 100000, paidCents: 0, dueDate: "2026-06-01" } as Invoice;
    expect(agedReceivables([invoice], now).days31to60).toBe(100000);
  });

  it("normalizes legacy invoice, bank and ledger values to integer cents", () => {
    const invoice = normalizeInvoiceDocument("INV-1", {
      totalEur: 121,
      subtotalEur: 100,
      vatEur: 21,
      paidEur: 20.5,
      lines: [{ id: "line-1", description: "Onderhoud", quantity: 1, unitPriceEur: 100, vatPercent: 21 }],
    });
    expect(invoice).toMatchObject({ totalCents: 12100, paidCents: 2050 });
    expect(invoice.lines[0].unitPriceCents).toBe(10000);
    expect(normalizeBankTransactionDocument("BT-1", { amountEur: -735.2 }).amountCents).toBe(-73520);
    expect(normalizeLedgerEntryDocument("LE-1", { amountEur: 685 }).amountCents).toBe(68500);
  });

  it("rejects conflicting dual-written finance values", () => {
    expect(() => normalizeBankTransactionDocument("BT-1", { amountCents: 10000, amountEur: 99 })).toThrow("Conflicterende geldvelden");
  });
});
