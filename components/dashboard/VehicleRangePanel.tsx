"use client";

import type { Vehicle } from "@/types";
import { vehicleRange, type RangeField } from "@/lib/vehicle/range";

const fields: { key: RangeField; label: string; source: string }[] = [
  { key: "wltpRangeKm", label: "WLTP (km)", source: "Mobilox WLTP" },
  { key: "realisticRangeKm", label: "Praktijkbereik (km)", source: "Mobilox Eigen identificatie" },
];

export function VehicleRangePanel({ vehicle, onChange }: {
  vehicle: Vehicle; onChange: (overrides: NonNullable<Vehicle["rangeOverrides"]>) => void;
}) {
  function reset(key: RangeField) {
    const next = { ...vehicle.rangeOverrides };
    delete next[key];
    onChange(next);
  }
  return <section className="panel">
    <h2>WLTP en praktijkbereik</h2>
    <p className="helper">Automatisch gevuld vanuit Mobilox. Je kunt beide waarden intern aanpassen. Sla de interne gegevens op vóór het maken van een showroomkaart of SOH-certificaat.</p>
    <div className="formGrid">
      {fields.map(({ key, label, source }) => <div key={key}>
        <label>{label}<input type="number" min="1" step="1" value={vehicleRange(vehicle, key) ?? ""}
          onChange={event => onChange({ ...vehicle.rangeOverrides, [key]: event.target.value === "" ? null : Number(event.target.value) })} /></label>
        <p className="helper">{vehicle.rangeOverrides?.[key] !== undefined ? "Intern ingevuld" : source} · Bronwaarde: {vehicle[key] === undefined ? "Niet opgegeven" : `${vehicle[key]!.toLocaleString("nl-NL")} km`}</p>
        {vehicle.rangeOverrides?.[key] !== undefined && <button type="button" className="button secondary" onClick={() => reset(key)}>Mobilox-waarde gebruiken</button>}
      </div>)}
    </div>
  </section>;
}
