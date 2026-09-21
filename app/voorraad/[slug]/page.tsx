import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { eur } from "@/lib/format";
import { centsToEuros } from "@/lib/money";
import { getPublicVehicleBySlug } from "@/lib/repositories/public-vehicle-repository";
import styles from "./vehicle.module.css";

export const revalidate = 60;
export const dynamicParams = true;

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
  const normalized = description?.replace(/\\s+/g, " ").trim();
  const containsTestText = normalized
    ? /(?:lorem|testtekst|gyubkbnbk)|\\b[a-z]{5,}\\.[a-z]{3,}[,;:]?/i.test(normalized)
    : false;
  if (!normalized || containsTestText) {
    return `${vehicleName} is geselecteerd op historie, technische staat en uitvoering. Hieronder ziet u de beschikbare specificaties, uitrusting en aandrijfgegevens.`;
  }
  return normalized;
}

export function generateStaticParams() {
  return [];
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
  const isElectric = publicDriveType === "Elektrisch";
  const isHybrid = publicDriveType === "Hybride" || publicDriveType === "Plug-in hybride";

  const specs = [
    ["Carrosserie", vehicle.bodyStyle || null],
    ["Kleur", vehicle.color || null],
    ["Aandrijving", publicDriveType],
    ["Transmissie", vehicle.transmission || null],
    ["Verbruik", vehicle.consumptionPer100Km ? `${vehicle.consumptionPer100Km} l/100 km` : null],
    ["Garantie", vehicle.warrantyMonths ? `${vehicle.warrantyMonths} maanden` : null],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  const vehicleFacts = [
    ["Accuconditie", vehicle.batteryHealthPercent !== undefined ? `${vehicle.batteryHealthPercent}%` : null],
    ["Elektrische actieradius", vehicle.electricRangeKm ? `${numberFormat.format(vehicle.electricRangeKm)} km` : null],
    ["Praktijkverbruik", vehicle.consumptionPer100Km ? `${vehicle.consumptionPer100Km} l/100 km` : null],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  const dataLabel = isElectric ? "Elektrische gegevens" : isHybrid ? "Hybride gegevens" : "Voertuiggegevens";
  const dataHeading = isElectric ? "Relevante elektrische gegevens." : isHybrid ? "Relevante hybride gegevens." : "Relevante voertuiggegevens.";
  const curatedHighlights = vehicle.highlights
    .filter(item => !/^\\d+\\s*kW lader$/i.test(item.trim()))
    .slice(0, 4);
  const remainingHighlights = vehicle.highlights.filter(item => !curatedHighlights.includes(item));
  const priceEur = centsToEuros(vehicle.priceCents);
  const isReserved = vehicle.status === "reserved";
  const tradeInHref = `/inruilen?vehicleId=${encodeURIComponent(vehicle.id)}&vehicleLabel=${encodeURIComponent(vehicleName + " " + vehicle.trim)}`;

  return <div className={styles.page}>
    <Header />
    <main className={styles.shell}>
      <div className={styles.breadcrumb}><Link href="/voorraad">← Terug naar voorraad</Link><span>Volt & Vroom Selectie · Groningen</span></div>
      <section className={styles.hero}>
        <div className={styles.visual}>
          {vehicle.images[0] ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model} ${vehicle.trim}`} /> : null}
          <div className={styles.visualTop}><span className={styles.status}><i /> {isReserved ? "Gereserveerd" : "Beschikbaar"}</span>{vehicleFacts.length ? <span className={styles.carcheckBadge}>{dataLabel}</span> : null}</div>
          <div className={styles.visualBottom}><div><span>Volt & Vroom selectie</span><strong>Zorgvuldig geselecteerd. Transparant gepresenteerd.</strong></div><div><span>Foto’s</span><strong>{String(vehicle.images.length).padStart(2,"0")}</strong></div></div>
        </div>
        <aside className={styles.side}>
          <p className={styles.eyebrow}>{publicDriveType}</p>
          <h1>{vehicle.brand}<br />{vehicle.model}</h1>
          <p className={styles.trim}>{vehicle.trim}</p>
          <div className={styles.price}>{vehicle.priceCents > 0 ? eur.format(priceEur) : "Prijs op aanvraag"}</div>
          <div className={styles.monthly}>{vehicle.monthlyPriceCents ? `Vanaf ${eur.format(centsToEuros(vehicle.monthlyPriceCents))} p/m` : "Persoonlijk voorstel op aanvraag"}</div>
          <div className={styles.quickFacts}>
            {vehicle.year ? <div><span>Bouwjaar</span><strong>{vehicle.year}</strong></div> : null}
            {vehicle.mileageKm !== undefined ? <div><span>Kilometerstand</span><strong>{numberFormat.format(vehicle.mileageKm)} km</strong></div> : null}
            <div><span>Aandrijving</span><strong>{publicDriveType}</strong></div>
            {vehicle.transmission ? <div><span>Transmissie</span><strong>{vehicle.transmission}</strong></div> : null}
          </div>
          <div className={styles.ctaStack}><a className={styles.primary} href="#afspraak">Plan een proefrit</a><Link className={styles.secondary} href={tradeInHref}>Bereken inruilindicatie</Link></div>
        </aside>
      </section>
      <section className={styles.story}>
        <div><span className={styles.sectionLabel}>Deze auto</span><h2>{vehicleName}<br />in het kort.</h2><p className={styles.storyLead}>{publicDescription(vehicle.description, vehicleName)}</p>{curatedHighlights.length ? <div className={styles.highlightGrid}>{curatedHighlights.map((item: string) => <span key={item}>✓ {item}</span>)}</div> : null}{remainingHighlights.length ? <details className={styles.allHighlights}><summary>Bekijk alle opties</summary><div className={styles.highlightGrid}>{remainingHighlights.map((item: string) => <span key={item}>✓ {item}</span>)}</div></details> : null}</div>
        <aside className={styles.factsCard}><h3>Specificaties</h3>{specs.length ? specs.map(([label, fact]) => <div className={styles.factRow} key={label}><span>{label}</span><strong>{fact}</strong></div>) : <p>Nadere specificaties volgen.</p>}</aside>
      </section>
      {vehicleFacts.length ? <section className={styles.intelligence} id="carcheck"><div className={styles.intelligenceHead}><div><span className={styles.sectionLabel}>{dataLabel}</span><h2>{dataHeading}<br />Alleen wat bekend is.</h2></div><p>Deze waarden komen uit de beschikbare voertuigdata. Een meetdatum of aanvullende bron vermelden we alleen wanneer die is aangeleverd.</p></div><div className={styles.intelligenceGrid}>{vehicleFacts.slice(0,4).map(([label, fact]) => <article className={styles.intelCard} key={label}><span>{label}</span><strong>{fact}</strong><small>beschikbare voertuigdata</small></article>)}</div></section> : null}
      <section className={styles.trust} id="afspraak"><span className={styles.sectionLabel}>Bekijk hem in Groningen</span><h2>De auto gezien.<br />Nu het verhaal erachter.</h2><p>Plan een persoonlijke proefrit. We nemen de auto en de beschikbare voertuigdata rustig met u door.</p><div className={styles.trustActions}><a className={styles.primary} href={`mailto:sales@voltvroom.nl?subject=${encodeURIComponent(`Proefrit ${vehicle.brand} ${vehicle.model}`)}`}>Plan een proefrit</a><a className={styles.secondary} href="mailto:sales@voltvroom.nl">Stel een vraag</a></div></section>
    </main>
    <div className={styles.stickyBar}><div><strong>{vehicle.brand} {vehicle.model}</strong><br /><span>{vehicle.trim}{vehicle.priceCents > 0 ? ` · ${eur.format(priceEur)}` : ""}</span></div><a href="#afspraak">Plan proefrit</a></div>
  </div>;
}
