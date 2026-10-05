import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VehicleGallery } from "@/components/vehicles/VehicleGallery";
import { Header } from "@/components/Header";
import { LeaseCalculator } from "@/components/financial-lease/LeaseCalculator";

import { centsToEuros } from "@/lib/money";
import { eligibleForLease } from "@/lib/financial-lease/business";
import { leaseRate } from "@/lib/financial-lease/config";
import { getPublicVehicleBySlug } from "@/lib/repositories/public-vehicle-repository";
import { vehicleContactHref } from "@/lib/contact/business";
import styles from "./vehicle.module.css";

// VVOS publication data changes at runtime; never serve a prerendered offer.
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 60;

// No demo URLs are enumerated at build time; force-dynamic takes precedence.
export function generateStaticParams() {
  return [];
}

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const numberFormat = new Intl.NumberFormat("nl-NL");

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
  const vehicle = await getPublicVehicleBySlug((await params).slug);
  if (!vehicle) return { title: "Auto niet beschikbaar | Volt & Vroom", robots: { index: false, follow: true } };
  const name = `${vehicle.brand} ${vehicle.model}`;
  const title = `${name}${vehicle.year ? ` ${vehicle.year}` : ""} | Volt & Vroom`;
  const facts = [vehicle.trim, vehicle.mileageKm !== undefined ? `${numberFormat.format(vehicle.mileageKm)} km` : "", vehicle.priceCents > 0 ? eur.format(centsToEuros(vehicle.priceCents)) : "Prijs op aanvraag"].filter(Boolean).join(" · ");
  const description = `${name}: ${facts}. Bekijk deze occasion bij Volt & Vroom in Groningen en plan een proefrit.`;
  const url = `/voorraad/${encodeURIComponent(vehicle.slug)}`;
  const images = vehicle.images[0] ? [{ url: vehicle.images[0], alt: name }] : [];
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images: images.map(image => image.url) },
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = await getPublicVehicleBySlug(slug);
  if (!vehicle) notFound();

  const publicDriveType = driveLabel(vehicle.driveType, vehicle.fuelType);
  const vehicleName = `${vehicle.brand} ${vehicle.model}`;


  const specs = [
    ["Carrosserie", vehicle.bodyStyle || null],
    ["Kleur", vehicle.color || null],
    ["Aandrijving", publicDriveType],
    ["Transmissie", vehicle.transmission || null],
    ["Opgegeven verbruik", vehicle.consumptionPer100Km ? `${vehicle.consumptionPer100Km} l/100 km` : null],
    ["Elektrische actieradius", vehicle.electricRangeKm ? `${numberFormat.format(vehicle.electricRangeKm)} km` : null],
    ["Accuconditie (aangeleverd)", vehicle.batteryHealthPercent !== undefined ? `${vehicle.batteryHealthPercent}%` : null],
    ["Garantie", vehicle.warrantyMonths ? `${vehicle.warrantyMonths} maanden` : null],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  const description = publicDescription(vehicle.description, vehicleName);
  const paragraphs = description.split(/\n\s*\n/).filter(Boolean);
  const firstParagraph = paragraphs[0] ?? description;
  const needsMore = description.length > 320;
  const summary = needsMore ? `${firstParagraph.slice(0, 280).replace(/\s+\S*$/, "")}…` : description;
  const highlights = [...new Set(vehicle.highlights)];
  const priceEur = centsToEuros(vehicle.priceCents);
  const isReserved = vehicle.status === "reserved";
  const tradeInHref = `/inruilen?vehicleId=${encodeURIComponent(vehicle.id)}&vehicleLabel=${encodeURIComponent(vehicleName + " " + vehicle.trim)}`;

  const contactHref = vehicleContactHref(vehicle.id, "proefrit");
  const vehicleUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || "https://www.voltvroom.nl").replace(/\/$/, "")}/voorraad/${encodeURIComponent(vehicle.slug)}`;
  const structuredData = {
    "@context": "https://schema.org", "@type": "Car", name: `${vehicleName} ${vehicle.trim}`,
    url: vehicleUrl, sku: vehicle.id, brand: { "@type": "Brand", name: vehicle.brand }, model: vehicle.model,
    image: vehicle.images, description,
    ...(vehicle.year ? { vehicleModelDate: String(vehicle.year) } : {}),
    ...(vehicle.mileageKm !== undefined ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileageKm, unitCode: "KMT" } } : {}),
    ...(vehicle.priceCents > 0 ? { offers: { "@type": "Offer", url: vehicleUrl,
      price: priceEur.toFixed(2), priceCurrency: "EUR",
      availability: isReserved ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      seller: { "@type": "AutoDealer", name: "Volt & Vroom", telephone: "+31646585468",
        address: { "@type": "PostalAddress", streetAddress: "Euvelgunnerweg 50", postalCode: "9723 CW", addressLocality: "Groningen", addressCountry: "NL" } },
    } } : {}),
  };

  return <div className={styles.page}>
    <Header />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <main className={styles.shell}>
      <div className={styles.breadcrumb}><Link href="/voorraad">← Terug naar voorraad</Link><span>Volt & Vroom Selectie · Groningen</span></div>
      <section className={styles.hero}>
        <VehicleGallery images={vehicle.images} name={`${vehicleName} ${vehicle.trim}`} reserved={isReserved} />
        <aside className={styles.side}>
          <p className={styles.eyebrow}>{publicDriveType}</p>
          <h1>{vehicleName}</h1>
          <p className={styles.trim}>{vehicle.trim}</p>
          <span className={styles.priceLabel}>Verkoopprijs</span><div className={styles.price}>{vehicle.priceCents > 0 ? eur.format(priceEur) : "Prijs op aanvraag"}</div>
          <p className={styles.priceNote}>Inclusief alle verplichte kosten.</p>
          <p className={styles.availability}>{isReserved ? "Gereserveerd" : "Beschikbaar bij Volt & Vroom in Groningen"}</p>
          <div className={styles.quickFacts}>
            {vehicle.year ? <div><span>Bouwjaar</span><strong>{vehicle.year}</strong></div> : null}
            {vehicle.mileageKm !== undefined ? <div><span>Kilometerstand</span><strong>{numberFormat.format(vehicle.mileageKm)} km</strong></div> : null}
            <div><span>Aandrijving</span><strong>{publicDriveType}</strong></div>
            {vehicle.transmission ? <div><span>Transmissie</span><strong>{vehicle.transmission}</strong></div> : null}
          </div>
          <div className={styles.ctaStack}><a className={styles.primary} href={contactHref} data-vv-event="test_drive_click">Plan een proefrit</a><a className={styles.secondary} href="tel:+31646585468">Bel 06 4658 5468</a><Link className={styles.textLink} href={tradeInHref}>Auto inruilen →</Link></div>
        </aside>
      </section>
      <section className={styles.story}>
        <div>
          <h2>Over deze auto</h2>
          <p className={styles.storyLead}>{summary}</p>
          {needsMore && <details className={styles.allHighlights}><summary>Lees de volledige beschrijving</summary><p className={styles.storyLead}>{description}</p></details>}
          {highlights.length > 0 && <details className={styles.allHighlights}><summary>Opties en uitrusting ({highlights.length})</summary><ul className={styles.highlightGrid}>{highlights.map(item => <li key={item}>{item}</li>)}</ul></details>}
        </div>
        <aside className={styles.factsCard}><h2>Specificaties</h2><dl>{specs.map(([label, fact]) => <div className={styles.factRow} key={label}><dt>{label}</dt><dd>{fact}</dd></div>)}</dl></aside>
      </section>
      {eligibleForLease(vehicle) && <LeaseCalculator vehicleId={vehicle.id} priceCents={vehicle.priceCents} annualRateBps={leaseRate()} />}
      <section className={styles.contact} id="afspraak">
        <p className={styles.contactEyebrow}>Bekijk hem in Groningen</p>
        <h2>De auto gezien.<br />Nu het verhaal erachter.</h2>
        <p>Plan een persoonlijke proefrit. We nemen de auto en de beschikbare voertuigdata rustig met u door.</p>
        <div className={styles.contactActions}><a className={styles.contactPrimary} href={contactHref} data-vv-event="test_drive_click">Plan een proefrit</a><Link className={styles.contactSecondary} href={vehicleContactHref(vehicle.id, "vraag")}>Stel een vraag</Link></div>
      </section>
      <nav className={styles.footerLinks} aria-label="Aanvullende informatie"><Link href="/voorraad">Alle auto’s</Link><Link href="/contact">Bedrijfsgegevens</Link><Link href="/privacy">Privacy</Link></nav>
    </main>

  </div>;
}
