import { NextResponse } from "next/server";

/** Retired: active inventory is owned exclusively by the Mobilox importer. */
export async function POST(_request: Request) {
  return NextResponse.json({ ok: false, error: "VWE-voorraadimport is beëindigd. Voorraad wordt beheerd via Mobilox." }, { status: 410 });
}
