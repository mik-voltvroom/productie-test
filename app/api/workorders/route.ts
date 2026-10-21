import { NextResponse } from "next/server";
import { z } from "zod";
import { workOrders } from "@/lib/workshop/sample-data";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";

const schema = z.object({
  customerName: z.string().min(2),
  vehicleLabel: z.string().min(2),
  mileageKm: z.number().nonnegative(),
  type: z.enum(["stock_preparation", "customer_maintenance", "warranty", "apk", "delivery"]),
  plannedStartAt: z.string(),
});

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "workshop.read");
  if (auth.response) return auth.response;
  return NextResponse.json({ items: workOrders, count: workOrders.length, mode: "demo" });
}

export async function POST(request: Request) {
  const auth = await authorizeApi(request, "workshop.write");
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige werkorder", issues: parsed.error.flatten() }, { status: 400 });
  const id = `wo-${Date.now()}`;
  const workOrder = { id, number: `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, ...parsed.data, status: "planned", message: "Werkorder gevalideerd. Koppel Firestore voor persistente opslag." };
  await writeAuditEvent({ action: "workorder.created", entityType: "workorder", entityId: id, actor: auth.actor, metadata: { type: parsed.data.type, vehicleLabel: parsed.data.vehicleLabel }, request });
  return NextResponse.json(workOrder, { status: 201 });
}
