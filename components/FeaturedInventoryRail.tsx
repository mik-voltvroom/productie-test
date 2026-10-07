import Link from "next/link";
import { eur, km } from "@/lib/format";
import { centsToEuros } from "@/lib/money";
import type { Vehicle } from "@/types";
import { VehicleHighlights } from "@/components/vehicles/VehicleHighlights";

function driveLabel(value: Vehicle["driveType"]) {
  if (value === "plug-in-hybrid") return "Plug-in hybride";
  if (value === "full-hybrid") return "Hybride";
  if (value === "combustion") return "Brandstof";
  return "Elektrisch";
}

export function FeaturedInventoryRail({ vehicles }: { vehicles: Vehicle[] }) {
  if (!vehicles.length) return null;

  return (
    <section className="featuredInventory" aria-labelledby="featured-inventory-title">
      <div className="container featuredInventoryHead">
        <div>
          <p className="eyebrow">Direct uit de actuele voorraad</p>
          <h2 id="featured-inventory-title">Auto’s die het bekijken waard zijn.</h2>
        </div>
        <Link className="textButton" href="/#voorraad">Bekijk volledig aanbod <span aria-hidden="true">→</span></Link>
      </div>

      <div className="featuredRail" aria-label="Uitgelicht aanbod">
        {vehicles.map((vehicle) => (
          <article className="featuredVehicle" key={vehicle.id}>
            <Link href={`/voorraad/${vehicle.slug}`} className="featuredVehicleMedia" aria-label={`Bekijk ${vehicle.brand} ${vehicle.model}`}>
              {vehicle.images[0]
                ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} loading="lazy" />
                : <div className="featuredVehicleFallback" aria-hidden="true">V&V</div>}
              <span className="featuredDrive">{driveLabel(vehicle.driveType)}</span>
            </Link>
            <div className="featuredVehicleBody">
              <div className="featuredVehicleTopline"><span>{vehicle.brand}</span><strong>{vehicle.priceCents > 0 ? eur.format(centsToEuros(vehicle.priceCents)) : "Prijs op aanvraag"}</strong></div>
              <h3>{vehicle.model}</h3>
              <VehicleHighlights trim={vehicle.trim} compact />
              <div className="featuredVehicleFacts">
                <span>{vehicle.year}</span>
                <span>{km.format(vehicle.mileageKm)} km</span>
                {vehicle.batteryHealthPercent !== undefined ? <span>SOH {vehicle.batteryHealthPercent}%</span> : null}
                {vehicle.electricRangeKm ? <span>{km.format(vehicle.electricRangeKm)} km elektrisch</span> : null}
              </div>
              <div className="featuredVehicleFooter">
                <span className="carcheckChip">CarCheck</span>
                <Link href={`/voorraad/${vehicle.slug}`}>Bekijk auto <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
