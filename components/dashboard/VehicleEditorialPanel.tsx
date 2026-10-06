"use client";
import type { Vehicle } from "@/types";
/** Compatibility for existing callers; editing moved to Mobilox. */
export function VehicleEditorialPanel(_props: { vehicle: Vehicle; onSaved: (vehicle: Vehicle) => void; enabled: boolean }) {
  return <section className="panel"><h2>Foto’s, opties en advertentietekst</h2><p>Beheer deze gegevens in Mobilox. VVOS neemt de actuele inhoud automatisch over.</p></section>;
}
