import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { centsToEuros } from "@/lib/money";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { isIconVehicle } from "@/lib/vehicle/business";
import styles from "./icons.module.css";

export const metadata: Metadata = {
  title: "Volt & Vroom Icons | Auto’s met karakter en historie",
  description: "Ontdek de visie achter Volt & Vroom Icons en bekijk de actuele selectie youngtimers, klassiekers in spe en bijzondere sportieve auto’s.",
  alternates: { canonical: "/icons" },
};

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("nl-NL");

const principles = [
  { number: "01", title: "Een verhaal dat klopt", text: "Herkomst, eigenaarschap, onderhoud en documentatie moeten samen een begrijpelijk beeld vormen. Niet ieder detail hoeft perfect te zijn, maar het verhaal moet aantoonbaar en eerlijk zijn." },
  { number: "02", title: "Originaliteit met context", text: "Originaliteit telt, net als zorgvuldig uitgevoerde verbeteringen. We beoordelen wat bij het model hoort, wat aantoonbaar is aangepast en wat dat betekent voor gebruik en waarde." },
  { number: "03", title: "Techniek voor rijplezier", text: "Karakter mag nooit een excuus zijn voor onduidelijkheid. Bekende modelpunten, onderhoudsbehoefte en technische staat leggen we concreet uit voordat u kiest." },
  { number: "04", title: "Blijvende relevantie", text: "Een Icon hoeft niet zeldzaam of extreem duur te zijn. De auto moet iets eigens hebben: ontwerp, techniek of rijbeleving die ook morgen nog betekenis houdt." },
];

export default async function IconsPage() {
  const iconVehicles = (await listPublicVehicles(100)).filter(isIconVehicle);

  return <>
    <Header />
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.copperLine} aria-hidden="true" />
          <div className={styles.categoryBrand}><Image src="/brand/icons/icons-3d.webp" alt="" width={64} height={64} /><p className={styles.eyebrow}>Volt &amp; Vroom Icons</p></div>
          <h1>Meer karakter.<br />Dezelfde standaard.</h1>
          <p className={styles.heroLead}>Youngtimers, klassiekers in spe en bijzondere sportieve auto’s, geselecteerd op historie, techniek en karakter.</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#icons-aanbod">Bekijk de Icons <span aria-hidden="true">→</span></a>
            <a className={styles.textAction} href="#visie">Onze visie <span aria-hidden="true">→</span></a>
          </div>
          <p className={styles.proofLine}><span>Historie gecontroleerd</span><span>Originaliteit beoordeeld</span><span>Techniek uitgelegd</span></p>
        </div>
        <div className={styles.heroMedia}>
          <img src="/editorial/icons-hero-v1.png" alt="Bijzondere sportieve auto in een rustige, lichte omgeving" />
        </div>
      </section>

      <section className={styles.vision} id="visie">
        <div className={styles.visionIntro}>
          <p className={styles.eyebrow}>Onze visie</p>
          <h2>Bijzonder is pas waardevol wanneer het verhaal klopt.</h2>
        </div>
        <div className={styles.visionCopy}>
          <p>Volt &amp; Vroom Icons is er voor auto’s die meer bieden dan vervoer alleen. Auto’s met een herkenbaar ontwerp, een bijzondere techniek of een rijbeleving die niet in een specificatielijst is samen te vatten.</p>
          <p>Wij kiezen niet op status, prijs of schaarste alleen. Een Icon moet overtuigen als geheel: met een begrijpelijke historie, een passende uitvoering, een technische staat die bij het gebruik past en karakter dat ook op langere termijn relevant blijft.</p>
          <p>Daarbij geldt exact dezelfde norm als voor iedere Volt &amp; Vroom-auto. We maken sterke punten zichtbaar, benoemen onzekerheden en leggen uit wat een bijzondere auto praktisch vraagt. Zo blijft emotie onderdeel van de keuze, zonder dat helderheid verdwijnt.</p>
        </div>
      </section>

      <section className={styles.principles} aria-labelledby="icons-principles-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Waar wij op selecteren</p>
          <h2 id="icons-principles-title">Geen label voor iedere bijzondere auto.</h2>
          <p>Icons is een bewuste selectie. Deze vier uitgangspunten bepalen of een auto binnen die wereld past.</p>
        </div>
        <div className={styles.principleGrid}>
          {principles.map(principle => <article key={principle.number}>
            <span>{principle.number}</span><h3>{principle.title}</h3><p>{principle.text}</p>
          </article>)}
        </div>
      </section>

      <section className={styles.inventory} id="icons-aanbod" aria-labelledby="icons-inventory-title">
        <div className={styles.inventoryHeading}>
          <div><p className={styles.eyebrow}>Actuele selectie</p><h2 id="icons-inventory-title">Aangeboden Icons.</h2></div>
          <Link href="/voorraad?collectie=icons">Bekijk in voorraad <span aria-hidden="true">→</span></Link>
        </div>

        {iconVehicles.length ? <div className={styles.inventoryGrid}>
          {iconVehicles.map(vehicle => <Link className={styles.vehicleCard} href={`/voorraad/${encodeURIComponent(vehicle.slug)}`} key={vehicle.id}>
            <div className={styles.vehicleImage}>{vehicle.images[0] ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} /> : <span>Foto volgt</span>}<small>Volt &amp; Vroom Icons</small></div>
            <div className={styles.vehicleBody}><div><p>{vehicle.brand}</p><h3>{vehicle.model}</h3><span>{vehicle.trim}</span></div><strong>{vehicle.priceCents > 0 ? money.format(centsToEuros(vehicle.priceCents)) : "Prijs op aanvraag"}</strong></div>
            <div className={styles.vehicleFacts}><span>{vehicle.year}</span><span>{number.format(vehicle.mileageKm)} km</span><span>{vehicle.transmission}</span></div>
            <span className={styles.vehicleLink}>Bekijk deze Icon <span aria-hidden="true">→</span></span>
          </Link>)}
        </div> : <div className={styles.emptyState}>
          <p className={styles.eyebrow}>Nieuwe selectie onderweg</p>
          <h3>Op dit moment staat er geen Icon online.</h3>
          <p>We vullen deze selectie alleen wanneer een auto aantoonbaar bij onze Icons-visie past. Bekijk intussen de volledige voorraad of neem contact op als u een specifieke karakterauto zoekt.</p>
          <div><Link className={styles.primaryAction} href="/voorraad">Bekijk alle voorraad <span aria-hidden="true">→</span></Link><Link className={styles.textAction} href="/contact">Vertel wat u zoekt <span aria-hidden="true">→</span></Link></div>
        </div>}
      </section>

      <section className={styles.closing}>
        <p className={styles.eyebrow}>Persoonlijke selectie</p>
        <h2>Een karakterauto vraagt om meer context.</h2>
        <p>Vertel ons welk tijdperk, model of type rijbeleving u zoekt. We denken mee over historie, techniek, gebruik en de plek van de auto in uw collectie of dagelijks leven.</p>
        <Link className={styles.primaryAction} href="/contact">Bespreek uw zoektocht <span aria-hidden="true">→</span></Link>
      </section>
    </main>
    <SiteFooter />
  </>;
}
