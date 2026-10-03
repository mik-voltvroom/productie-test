"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Vehicle } from "@/types";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import { driveTypeLabel, monthlyRoadTaxLabel, showroomAdvertisementUrl } from "@/lib/vehicle/showroom-card";
import styles from "./ShowroomCard.module.css";

const price = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("nl-NL");

function factValue(value: number | undefined, suffix = " km"): string {
  return value === undefined ? "Niet opgegeven" : `${number.format(value)}${suffix}`;
}

export function ShowroomCard({ vehicle }: { vehicle: Vehicle }) {
  const publicImages = getPublicVehicleImages(vehicle);
  const heroImage = publicImages[0] ?? vehicle.images[0];
  const advertisementUrl = showroomAdvertisementUrl(
    vehicle.slug,
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.voltvroom.nl",
  );
  const facts = [
    { label: "WLTP", value: factValue(vehicle.wltpRangeKm), icon: "/brand/icons/elektrisch.svg" },
    { label: "Praktijkbereik", value: factValue(vehicle.realisticRangeKm), icon: "/brand/icons/praktijkverbruik.svg" },
    { label: "Wegenbelasting", value: monthlyRoadTaxLabel(vehicle.roadTax), icon: "/brand/icons/financiering.svg" },
    { label: "Kilometerstand", value: factValue(vehicle.mileageKm), icon: "/brand/icons/kilometerstand.svg" },
  ];

  return (
    <article className={`${styles.sheet} showroomCardSheet`} aria-label={`Showroomkaart voor ${vehicle.brand} ${vehicle.model}`}>
      <header className={styles.brandBar}>
        <img src="/brand/vv-logo-horizontal.svg" alt="Volt & Vroom" />
        <span>{driveTypeLabel(vehicle.driveType)}</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.priceBlock}>
          <strong>{price.format(vehicle.priceCents / 100)}</strong>
          <i aria-hidden="true" />
        </div>
        {heroImage
          ? <img className={styles.vehicleImage} src={heroImage} alt={`${vehicle.brand} ${vehicle.model}`} />
          : <div className={styles.missingImage}>Geen voertuigfoto beschikbaar</div>}
      </section>

      <section className={styles.facts} aria-label="Voertuiggegevens">
        {facts.map(item => (
          <div className={styles.fact} key={item.label}>
            <img src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        <div className={styles.qrBlock}>
          <QRCodeSVG
            value={advertisementUrl}
            size={260}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#0d1117"
            title={`Advertentie ${vehicle.brand} ${vehicle.model}`}
          />
          <p>Scan voor de actuele advertentie</p>
        </div>
        <div className={styles.vehicleTitle}>
          <h1>{vehicle.brand} {vehicle.model}</h1>
          <p>{vehicle.trim || `${vehicle.year}`}</p>
          <div className={styles.address}>
            <span>Euvelgunnerweg 50 · Groningen</span>
            <strong>voltvroom.nl</strong>
          </div>
          <small>Wegenbelasting: bron Mobilox / Hexon, omgerekend van kwartaal- naar maandbedrag.</small>
        </div>
      </footer>
    </article>
  );
}
