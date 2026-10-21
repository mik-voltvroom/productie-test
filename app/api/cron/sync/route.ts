import { NextResponse } from "next/server";
import { reconcileHexonInventoryDuplicates } from "@/lib/integrations/hexon-service";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron is niet geconfigureerd" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  try {
    const inventory = await reconcileHexonInventoryDuplicates();
    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      jobs: [{ name: "archive_duplicate_inventory", status: "completed", ...inventory }],
    });
  } catch (error) {
    console.error("Inventory reconciliation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Voorraadreconciliatie mislukt." }, { status: 500 });
  }
}
