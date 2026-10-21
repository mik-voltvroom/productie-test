import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import type { Vehicle } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function newestFirst(left: Vehicle, right: Vehicle): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export async function GET(request: Request): Promise<Response> {
  const authorization = await authorizeApi(request, "vehicles.read");
  if (authorization.response) return authorization.response;
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: "VVOS database niet beschikbaar." }, { status: 503 });
  }

  try {
    const snapshot = await adminDb.collection("vehicles").get();
    const vehicles: Vehicle[] = [];

    for (const document of snapshot.docs) {
      try {
        vehicles.push(normalizeVehicleDocument(document.id, document.data()));
      } catch (error) {
        console.error(
          "VVOS inventory document skipped",
          document.id,
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }

    return NextResponse.json(
      { ok: true, vehicles: vehicles.sort(newestFirst) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("VVOS inventory read failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Voorraad kon niet worden geladen." }, { status: 500 });
  }
}
