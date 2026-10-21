import { NextResponse } from "next/server";
function normalizePlate(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export async function GET(request: Request) {
  const plate = normalizePlate(new URL(request.url).searchParams.get("kenteken") ?? "");
  if (plate.length < 6) return NextResponse.json({ error: "Ongeldig kenteken" }, { status: 400 });
  const base = process.env.RDW_API_BASE_URL;
  if (!base && process.env.VVOS_DATA_MODE === "firebase") {
    return NextResponse.json({ ok: false, error: "RDW-opvraag is niet geconfigureerd." }, { status: 503 });
  }
  if (!base) return NextResponse.json({ mode: "demo", vehicle: { licensePlate: plate, brand: "", model: "", year: new Date().getFullYear(), fuelType: "Benzine / elektrisch" }, warning: "RDW_API_BASE_URL ontbreekt; vul gegevens handmatig aan." });
  const response = await fetch(`${base}?kenteken=${encodeURIComponent(plate)}`, { headers: process.env.RDW_API_KEY ? { authorization: `Bearer ${process.env.RDW_API_KEY}` } : undefined, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "RDW-opvraag mislukt" }, { status: 502 });
  return NextResponse.json({ mode: "live", vehicle: await response.json() });
}
