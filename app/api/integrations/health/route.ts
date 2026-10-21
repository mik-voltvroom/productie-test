import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";
import { getIntegrationHealth } from "@/lib/integrations/health";

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "integrations.read");
  if (auth.response) return auth.response;
  const remote = new URL(request.url).searchParams.get("remote") === "true";
  const items = await getIntegrationHealth(remote);
  await writeAuditEvent({ action: "integrations.health_checked", entityType: "integration", actor: auth.actor, metadata: { remote, degraded: items.filter((item) => item.state === "degraded").length }, request });
  return NextResponse.json({ items, checkedAt: new Date().toISOString() });
}
