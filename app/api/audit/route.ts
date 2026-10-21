import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { listAuditEvents } from "@/lib/audit/audit-log";

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "audit.read");
  if (auth.response) return auth.response;
  const requested = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  return NextResponse.json({ items: await listAuditEvents(Number.isFinite(requested) ? requested : 50) });
}
