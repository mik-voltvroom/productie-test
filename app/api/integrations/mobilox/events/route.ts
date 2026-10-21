import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeHexonIntegrationEvent } from "@/lib/integrations/hexon-events";

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "audit.read");
  if (auth.response) return auth.response;
  if (!adminDb) return NextResponse.json({ items: [], error: "Database niet beschikbaar." }, { status: 503 });
  const db = adminDb;

  const requested = Number(new URL(request.url).searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 25;
  try {
    // Filtering by provider and ordering by receivedAt requires a composite
    // Firestore index. Read the recent event stream first and filter in the
    // server so the operational monitor also works before optional indexes are deployed.
    const snapshot = await db
      .collection("integrationEvents")
      .orderBy("receivedAt", "desc")
      .limit(Math.min(Math.max(limit * 4, 100), 400))
      .get();

    const events = snapshot.docs
      .map(doc => normalizeHexonIntegrationEvent(doc.id, doc.data()))
      .filter(event => event !== null)
      .slice(0, limit);

    const items = await Promise.all(events.map(async (event) => {
      const vehicleId = event.externalId ? `hexon-${event.externalId}` : undefined;
      let vehicle: Record<string, unknown> | null = null;
      if (vehicleId) {
        const vehicleSnapshot = await db.collection("vehicles").doc(vehicleId).get();
        vehicle = vehicleSnapshot.exists ? vehicleSnapshot.data() ?? null : null;
      }
      return {
        ...event,
        sourceVehicleId: event.externalId,
        vehicleId,
        vehicle: vehicle ? {
          licensePlate: vehicle.licensePlate ?? null,
          brand: vehicle.brand ?? null,
          model: vehicle.model ?? null,
          type: vehicle.type ?? null,
          syncStatus: vehicle.syncStatus ?? null,
        } : null,
      };
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Mobilox sync monitor read failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ items: [], error: "Mobilox-events konden niet worden geladen." }, { status: 500 });
  }
}
