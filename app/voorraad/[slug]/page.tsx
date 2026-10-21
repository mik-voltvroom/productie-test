import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import cta from "@/components/vehicles/vehicle-cta.module.css";
import { VehicleGallery } from "@/components/vehicles/VehicleGallery";
import { PublicCarCheck } from "@/components/carcheck/PublicCarCheck";
import { VehicleHighlights } from "@/components/vehicles/VehicleHighlights";
import { Header } from "@/components/Header";
import { LeaseCalculator } from "@/components/financial-lease/LeaseCalculator";

import { centsToEuros } from "@/lib/money";
import { eligibleForLease, vehicleLeaseDefaults } from "@/lib/financial-lease/business";
import { leaseRate } from "@/lib/financial-lease/config";
import { getPublicVehicleBySlug } from "@/lib/repositories/public-vehicle-repository";
import { vehicleContactHref } from "@/lib/contact/business";
import { vehicleSpecifications } from "@/lib/vehicle/specifications";
import { descriptionBlocks, vehicleDescription } from "@/lib/vehicle/description";
import { canonicalUrl, serializeJsonLd, vehicleSchema } from "@/lib/seo/business";
import { vehicleMetadata } from "@/lib/seo/metadata";
import { publicVehicleHref } from "@/lib/vehicle-lookup/business";
import styles from "./vehicle.module.css";

// VVOS publication data changes at runtime; never serve a prerendered offer.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

// No demo URLs are enumerated at build time; force-dynamic takes precedence.
export function generateStaticParams() {
  return [];
}

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const numberFormat = new Intl.NumberFormat("nl-NL");
// Request-local only: metadata and body share one publication/price snapshot.
const getVehicle = cache(getPublicVehicleBySlug);

function driveLabel(driveType?: string, fuelType?: string): string {
  const value = `${driveType ?? ""} ${fuelType ?? ""}`.toLowerCase();
  if (value.includes("plug-in-hybrid")) return "Plug-in hybride";
  if (value.includes("full-hybrid") || value.includes("hybrid") || value.includes("hybride")) return "Hybride";
  if (value.includes("electric") || value.includes("elektrisch")) return "Elektrisch";
  if (value.includes("diesel")) return "Diesel";
  if (value.includes("benzine") || value.includes("petrol")) return "Benzine";
  return fuelType || "Aandrijving niet vermeld";
}

function publicDescription(description: string | undefined, vehicleName: string): string {
  return description?.trim() || `Bekijk hieronder de beschikbare gegevens en uitrusting van deze ${vehicleName}.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const vehicle = await getVehicle((await params).slug);
  if (!vehicle) return { title: "Auto niet beschikbaar | Volt & Vroom", robots: { index: false, follow: true } };
  return vehicleMetadata(vehicle);
}

export default async function VehiclePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) notFound();
  // The alias is observed history; availability and its current destination remain mutable.
  if (vehicle.slug !== slug) redirect(publicVehicleHref(vehicle.slug, await searchParams ?? {}));

  const publicDriveType = driveLabel(vehicle.driveType, vehicle.fuelType);
  const vehicleName = `${vehicle.brand} ${vehicle.model}`;


  const specs = vehicleSpecifications(vehicle);

  const description = publicDescription(vehicle.description, vehicleName);
  const { authored, generated } = vehicleDescription(description);
  const blocks = descriptionBlocks(authored);
  const highlights = [...new Set(vehicle.highlights)];
  const priceEur = centsToEuros(vehicle.priceCents);
  const leaseDefaults = vehicleLeaseDefaults(vehicle.priceCents);
  const isReserved = vehicle.status === "reserved";
  const tradeInHref = `/inruilen?vehicleId=${encodeURIComponent(vehicle.id)}&vehicleLabel=${encodeURIComponent(vehicleName + " " + vehicle.trim)}`;

  const contactHref = vehicleContactHref(vehicle.id, "proefrit");
  const structuredData = vehicleSchema(vehicle, description);
  const breadcrumbData = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Voorraad", item: canonicalUrl("/voorraad") },
    { "@type": "ListItem", position: 2, name: vehicleName, item: structuredData.url },
  ] };

  const carCheck = await PublicCarCheck({ vehicleId: vehicle.id });
  return <div className={styles.page}>
    <Header />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbData) }} />
    <main className={styles.shell}>
      <div className={styles.breadcrumb}><Link href="/voorraad">← Terug naar voorraad</Link><span>Volt & Vroom Selectie · Groningen</span></div>
      <section className={styles.hero}>
        <div className={`${styles.vehicleContent} ${styles.vehicleSidebar}`}>
        <aside className={styles.side}>
          <p className={styles.eyebrow}>{publicDriveType}</p>
          <h1>{vehicleName}</h1>
          <VehicleHighlights trim={vehicle.trim} />
          <span className={styles.priceLabel}>Verkoopprijs</span><div className={styles.price}>{vehicle.priceCents > 0 ? eur.format(priceEur) : "Prijs op aanvraag"}</div>
          {eligibleForLease(vehicle) && <LeaseCalculator key={vehicle.id} vehicleId={vehicle.id} priceCents={vehicle.priceCents} annualRateBps={leaseRate()} initialSelection={leaseDefaults.selection} initialNotice={leaseDefaults.notice} compact />}
          <p className={styles.priceNote}>Inclusief alle verplichte kosten.</p>
          <p className={styles.availability}>{isReserved ? "Gereserveerd" : "Beschikbaar bij Volt & Vroom in Groningen"}</p>
          <div className={styles.quickFacts}>
            {vehicle.year ? <div><span>Bouwjaar</span><strong>{vehicle.year}</strong></div> : null}
            {vehicle.mileageKm !== undefined ? <div><span>Kilometerstand</span><strong>{numberFormat.format(vehicle.mileageKm)} km</strong></div> : null}
            <div><span>Aandrijving</span><strong>{publicDriveType}</strong></div>
            {vehicle.transmission ? <div><span>Transmissie</span><strong>{vehicle.transmission}</strong></div> : null}
          </div>
          <div className={styles.ctaStack}><a className={`${styles.primary} ${cta.dark}`} href={contactHref} data-vv-event="test_drive_click">Plan een proefrit</a><a className={styles.secondary} href="tel:+31646585468">Bel 06 4658 5468</a><Link className={styles.textLink} href={tradeInHref}>Auto inruilen →</Link></div>
        </aside>
        <aside className={styles.factsCard}><h2>Specificaties</h2><dl>{specs.map(([label, fact]) => <div className={styles.factRow} key={label}><dt>{label}</dt><dd>{fact}</dd></div>)}</dl></aside>
        </div>
        <div className={styles.vehicleContent} aria-label="Voertuigbeschrijving en specificaties">
          <VehicleGallery images={vehicle.images} name={`${vehicleName} ${vehicle.trim}`} />
          <article className={styles.story} aria-label="Voertuigbeschrijving">
            {blocks.map((block, index) => block.type === "heading"
              ? <h2 key={index}>{block.lines[0]}</h2>
              : block.type === "list"
                ? <ul className={styles.highlightGrid} key={index}>{block.lines.map((line, item) => <li key={item}>{line}</li>)}</ul>
                : <p className={index === 1 ? styles.storyLead : styles.storyParagraph} key={index}>{block.lines[0]}</p>)}
          </article>
          {carCheck}
          {highlights.length > 0 && <details className={styles.allHighlights}><summary>Opties en uitrusting ({highlights.length})</summary><ul className={styles.highlightGrid}>{highlights.map(item => <li key={item}>{item}</li>)}</ul></details>}
          {generated && <details className={styles.allHighlights}><summary>Aanvullende Mobilox-gegevens</summary><p className={styles.storyParagraph}>{generated}</p></details>}
        </div>
      </section>
      <section className={styles.contact} id="afspraak">
        <p className={styles.contactEyebrow}>Bekijk hem in Groningen</p>
        <h2>De auto gezien.<br />Nu het verhaal erachter.</h2>
        <p>Plan een persoonlijke proefrit. We nemen de auto en de beschikbare voertuigdata rustig met u door.</p>
        <div className={styles.contactActions}><a className={styles.contactPrimary} href={contactHref} data-vv-event="test_drive_click">Plan een proefrit</a><Link className={`${styles.contactSecondary} ${cta.dark}`} href={vehicleContactHref(vehicle.id, "vraag")}>Stel een vraag</Link></div>
      </section>
      <nav className={styles.footerLinks} aria-label="Aanvullende informatie"><Link href="/voorraad">Alle auto’s</Link><Link href="/contact">Bedrijfsgegevens</Link><Link href="/privacy">Privacy</Link></nav>
    </main>

  </div>;
}
