import { NextResponse } from "next/server";
import { z } from "zod";
import { financeInvoices } from "@/lib/finance/sample-data";
import { invoiceTotals } from "@/lib/finance/business";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";

const lineSchema = z.object({
  description: z.string().min(2),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int(),
  vatPercent: z.number().min(0).max(100),
  vehicleId: z.string().optional(),
  workOrderId: z.string().optional(),
});
const invoiceSchema = z.object({
  kind: z.enum(["sales", "purchase", "credit"]),
  customerOrSupplier: z.string().min(2),
  invoiceDate: z.string(),
  dueDate: z.string(),
  lines: z.array(lineSchema).min(1),
});

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "finance.read");
  if (auth.response) return auth.response;
  return NextResponse.json({ items: financeInvoices, count: financeInvoices.length, mode: "demo" });
}

export async function POST(request: Request) {
  const auth = await authorizeApi(request, "finance.write");
  if (auth.response) return auth.response;
  const parsed = invoiceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige factuur", issues: parsed.error.flatten() }, { status: 400 });
  const totals = invoiceTotals(parsed.data.lines.map((line, index) => ({ id: `line-${index + 1}`, ...line })));
  const invoice = {
    id: `INV-${Date.now()}`,
    number: `VV-${new Date().getFullYear()}-PREVIEW`,
    status: "draft",
    ...parsed.data,
    ...totals,
    paidCents: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: "preview",
  };
  await writeAuditEvent({ action: "invoice.created", entityType: "invoice", entityId: invoice.id, actor: auth.actor, metadata: { kind: invoice.kind, totalCents: totals.totalCents }, request });
  return NextResponse.json(invoice, { status: 201 });
}
