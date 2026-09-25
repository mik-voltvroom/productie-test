import { createVehicleFeed } from "@/lib/merchant";
import { vehicles } from "@/lib/sample-data";
import { adminDb } from "@/lib/firebase-admin";
import type { Vehicle } from "@/types";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";
import { isPublishedToMerchant } from "@/lib/vehicle/publication";

export async function GET() {
  const productionDataMode = process.env.VVOS_DATA_MODE === "firebase";
  if (productionDataMode && !adminDb) {
    return Response.json({ ok: false, error: "Voertuigvoorraad is niet beschikbaar." }, { status: 503 });
  }

  let feedVehicles = vehicles;
  if (productionDataMode && adminDb) {
    try {
      const snapshot = await adminDb.collection("vehicles").where("status", "==", "available").get();
      feedVehicles = snapshot.docs
        .map((document) => normalizeVehicleDocument(document.id, document.data()))
        .filter(isPublishedToMerchant);
    } catch {
      return Response.json({ ok: false, error: "Voertuigvoorraad kon niet worden geladen." }, { status: 503 });
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.voltvroom.nl";
  return new Response(createVehicleFeed(feedVehicles, baseUrl), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=900, stale-while-revalidate=3600"
    }
  });
}
