import { NextResponse } from "next/server";
import { financeInvoices, inventoryFunding, kpiSnapshots } from "@/lib/finance/sample-data";
import { invoiceOpenAmount } from "@/lib/finance/business";
import { authorizeApi } from "@/lib/auth/api";

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "finance.read");
  if (auth.response) return auth.response;
  const current = kpiSnapshots.at(-1);
  return NextResponse.json({
    current,
    receivablesCents: financeInvoices.filter((item) => item.kind === "sales").reduce((sum, item) => sum + invoiceOpenAmount(item), 0),
    payablesCents: financeInvoices.filter((item) => item.kind === "purchase").reduce((sum, item) => sum + invoiceOpenAmount(item), 0),
    activeFundingEur: inventoryFunding.filter((item) => item.status === "active").reduce((sum, item) => sum + item.principalEur, 0),
    generatedAt: new Date().toISOString(),
    mode: "demo",
  });
}
