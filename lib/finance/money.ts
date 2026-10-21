import type { BankTransaction, Invoice, InvoiceLine, LedgerEntry } from "@/types";
import { assertEurocents, assertSignedEurocents, eurosToCents, signedEurosToCents } from "@/lib/money";

function cents(record: Record<string, unknown>, centsField: string, euroField: string): number {
  const centsValue = record[centsField];
  const euroValue = record[euroField];
  if (typeof centsValue === "number") {
    const normalized = assertEurocents(centsValue, centsField);
    if (typeof euroValue === "number" && normalized !== eurosToCents(euroValue, euroField)) {
      throw new Error(`Conflicterende geldvelden ${centsField} en ${euroField}.`);
    }
    return normalized;
  }
  if (typeof euroValue === "number") return eurosToCents(euroValue, euroField);
  throw new Error(`Financieel veld ${centsField} ontbreekt.`);
}

function signedCents(record: Record<string, unknown>, centsField: string, euroField: string): number {
  const centsValue = record[centsField];
  const euroValue = record[euroField];
  if (typeof centsValue === "number") {
    const normalized = assertSignedEurocents(centsValue, centsField);
    if (typeof euroValue === "number" && normalized !== signedEurosToCents(euroValue, euroField)) {
      throw new Error(`Conflicterende geldvelden ${centsField} en ${euroField}.`);
    }
    return normalized;
  }
  if (typeof euroValue === "number") return signedEurosToCents(euroValue, euroField);
  throw new Error(`Financieel veld ${centsField} ontbreekt.`);
}

function normalizeInvoiceLine(value: unknown, index: number): InvoiceLine {
  if (!value || typeof value !== "object") throw new Error(`Factuurregel ${index + 1} is ongeldig.`);
  const record = { ...(value as Record<string, unknown>) };
  record.unitPriceCents = cents(record, "unitPriceCents", "unitPriceEur");
  delete record.unitPriceEur;
  return record as unknown as InvoiceLine;
}

export function normalizeInvoiceDocument(id: string, value: Record<string, unknown>): Invoice {
  const record: Record<string, unknown> = { ...value, id };
  for (const [centsField, euroField] of [
    ["subtotalCents", "subtotalEur"],
    ["vatCents", "vatEur"],
    ["totalCents", "totalEur"],
    ["paidCents", "paidEur"],
  ] as const) {
    record[centsField] = cents(record, centsField, euroField);
    delete record[euroField];
  }
  if (!Array.isArray(record.lines)) throw new Error("Factuurregels ontbreken.");
  record.lines = record.lines.map(normalizeInvoiceLine);
  return record as unknown as Invoice;
}

export function normalizeBankTransactionDocument(id: string, value: Record<string, unknown>): BankTransaction {
  const record: Record<string, unknown> = { ...value, id };
  record.amountCents = signedCents(record, "amountCents", "amountEur");
  delete record.amountEur;
  return record as unknown as BankTransaction;
}

export function normalizeLedgerEntryDocument(id: string, value: Record<string, unknown>): LedgerEntry {
  const record: Record<string, unknown> = { ...value, id };
  record.amountCents = cents(record, "amountCents", "amountEur");
  delete record.amountEur;
  return record as unknown as LedgerEntry;
}
