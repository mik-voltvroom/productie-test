import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { matchVehicles, vehicleFinderAnswersSchema } from "@/lib/vehicle-finder/business";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = vehicleFinderAnswersSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Controleer uw antwoorden en probeer het opnieuw." }, { status: 400 });
  }

  try {
    const vehicles = await listPublicVehicles(100);
    const results = matchVehicles(vehicles, parsed.data).map(({ vehicle, reasons, cautions }) => ({
      id: vehicle.id,
      slug: vehicle.slug,
      imageUrl: vehicle.images[0] || null,
      brand: vehicle.brand,
      model: vehicle.model,
      trim: vehicle.trim,
      priceCents: vehicle.priceCents,
      year: vehicle.year,
      mileageKm: vehicle.mileageKm,
      driveType: vehicle.driveType,
      transmission: vehicle.transmission,
      wltpRangeKm: vehicle.wltpRangeKm,
      realisticRangeKm: vehicle.realisticRangeKm,
      electricRangeKm: vehicle.electricRangeKm,
      batteryHealthPercent: vehicle.batteryHealthPercent,
      reasons,
      cautions,
    }));
    return Response.json({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Vehicle finder inventory unavailable", error instanceof Error ? error.message : "unknown error");
    return Response.json({ ok: false, error: "De actuele voorraad kan nu niet worden geladen. Probeer het later opnieuw." }, { status: 503 });
  }
}
