import { NextResponse } from "next/server";
import { z } from "zod";
import { warrantyClaims } from "@/lib/workshop/sample-data";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";

const schema = z.object({ customerName: z.string().min(2), vehicleLabel: z.string().min(2), complaint: z.string().min(5), estimatedCostEur: z.number().nonnegative() });

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "workshop.read");
  if (auth.response) return auth.response;
  return NextResponse.json({ items: warrantyClaims, count: warrantyClaims.length, mode: "demo" });
}

export async function POST(request: Request) {
  const auth = await authorizeApi(request, "workshop.write");
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige claim", issues: parsed.error.flatten() }, { status: 400 });
  const id = `claim-${Date.now()}`;
  const claim = { id, claimNumber: `GAR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, status: "reported", ...parsed.data, message: "Claim geregistreerd in previewmodus." };
  await writeAuditEvent({ action: "warranty_claim.created", entityType: "warranty_claim", entityId: id, actor: auth.actor, metadata: { estimatedCostEur: parsed.data.estimatedCostEur, vehicleLabel: parsed.data.vehicleLabel }, request });
  return NextResponse.json(claim, { status: 201 });
}
