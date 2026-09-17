import Image from "next/image";
import type { Metadata } from "next";
import { AnimatedProcessSteps } from "@/components/AnimatedProcessSteps";
import { AssuranceShowcase } from "@/components/AssuranceShowcase";
import { ContactForm } from "@/components/ContactForm";
import { FeaturedInventoryRail } from "@/components/FeaturedInventoryRail";
import { FloatingContactDock } from "@/components/FloatingContactDock";
import { Header } from "@/components/Header";
import { HomepageSocialVideos } from "@/components/HomepageSocialVideos";
import { HomepageSocialFeed } from "@/components/HomepageSocialFeed";
import { SiteFooter } from "@/components/SiteFooter";
import { VehicleCard } from "@/components/VehicleCard";
import { eur } from "@/lib/format";
import { centsToEuros } from "@/lib/money";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";

// De homepage toont dezelfde live Firestore-voorraad als /voorraad.
// Forceer dynamische rendering zodat een tijdens de build lege voorraad niet
// als statische homepage in de App Hosting-cache blijft hangen.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

const promises = [
  { icon: "/brand/icons/historie.svg", title: "Historie gecontroleerd", text: "Onderhoud, kilometerstand en bekende voertuiggegevens worden vóór publicatie beoordeeld." },
  { icon: "/brand/icons/onderhoud.svg", title: "Techniek beoordeeld", text: "Technische staat, uitvoering en gebruiksrisico worden als één geheel bekeken." },
  { icon: "/brand/icons/accugezondheid.svg", title: "Accudata indien beschikbaar", text: "Bij hybride en elektrische auto’s tonen we aangeleverde accu-informatie met passende context." },
];

export default async function HomePage() {
  const vehicles = await listPublicVehicles(8);
  const featuredVehicles = vehicles.slice(0, 6);
  const latestVehicle = vehicles[0];
  const contactVehicles = vehicles.map(vehicle => ({ id: vehicle.id, label: `${vehicle.brand} ${vehicle.model} ${vehicle.trim}` }));

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "AutoDealer", name: "Volt & Vroom", description: "Onafhankelijke specialist voor zorgvuldig geselecteerde hybride en elektrische occasions.", url: "https://www.voltvroom.nl", telephone: "+31619163531", email: "sales@voltvroom.nl", address: { "@type": "PostalAddress", streetAddress: "Euvelgunnerweg 50", postalCode: "9723 CW", addressLocality: "Groningen", addressCountry: "NL" }, areaServed: ["Groningen", "Drenthe", "Friesland"] }) }} />
    <a className="skipLink" href="#inhoud">Ga naar de inhoud</a>
    <Header />
    <main id="inhoud">
      <section className="heroShell heroShellRefresh" aria-labelledby="hero-title">
        <div className="container hero heroRefresh">
          <div className="heroCopy">
            <p className="eyebrow">Volt &amp; Vroom · Groningen</p>
            <h1 id="hero-title">Slim rijden.<br /><em>Meer genieten.</em></h1>
            <p className="heroDescriptor">Hybride en elektrische occasions, geselecteerd op historie, techniek en dagelijks gebruik. Bij elke auto ziet u wat we hebben gecontroleerd — inclusief accudata wanneer die beschikbaar is.</p>
            <div className="heroTrustRow" aria-label="Onze vier zekerheden"><span>Historie gecontroleerd</span><span>Techniek beoordeeld</span><span>Accudata indien beschikbaar</span><span>Financiering mogelijk</span></div>
            <div className="actions heroActions">
              <a className="button heroPrimaryButton" href="#uitgelicht">Bekijk aanbod <span aria-hidden="true">→</span></a>
              <a className="button secondary" href="/keuzehulp">Vind de juiste auto</a>
            </div>
          </div>
          <div className="heroVisual heroVisualRefresh">
            {latestVehicle ? <a className="latestHeroVehicle" href={`/voorraad/${latestVehicle.slug}`} aria-label={`Bekijk ${latestVehicle.brand} ${latestVehicle.model}`}>
              <div className="latestHeroMedia">
                {latestVehicle.images[0]
                  ? <img src={latestVehicle.images[0]} alt={`${latestVehicle.brand} ${latestVehicle.model} ${latestVehicle.trim}`} />
                  : <div className="latestHeroFallback"><span>V&amp;V</span></div>}
                <span className="latestHeroLabel">Net binnengekomen</span>
              </div>
              <div className="latestHeroInfo">
                <div><span>{latestVehicle.driveType === "electric" ? "Elektrisch" : latestVehicle.driveType === "plug-in-hybrid" ? "Plug-in hybride" : latestVehicle.driveType === "full-hybrid" ? "Hybride" : latestVehicle.fuelType}</span><h2>{latestVehicle.brand} {latestVehicle.model}</h2><p>{latestVehicle.trim}</p></div>
                <strong>{latestVehicle.priceCents > 0 ? eur.format(centsToEuros(latestVehicle.priceCents)) : "Prijs op aanvraag"}</strong>
              </div>
            </a> : <div className="heroArtwork"><Image src="/editorial/hero-v2.png" alt="Een witte elektrische auto en een grafietgrijze hybride auto in een rustige studio" fill priority sizes="(max-width: 980px) 100vw, 52vw" /></div>}
          </div>
        </div>
      </section>

      <div id="uitgelicht"><FeaturedInventoryRail vehicles={featuredVehicles} /></div>

      <HomepageSocialVideos />

      <HomepageSocialFeed />

      <section className="proofBar proofBarRefresh" aria-label="Drie zekerheden van Volt & Vroom"><div className="container proofGrid proofGridPromises">
        {promises.map(item => <div className="proofPromise" key={item.title}><Image src={item.icon} alt="" width={34} height={34} /><div><strong>{item.title}</strong><span>{item.text}</span></div></div>)}
      </div></section>

      <section id="waarom" className="section assuranceSection">
        <div className="assuranceContainer">
          <div className="assuranceHeading"><p className="eyebrow">Onze aanpak</p><h2>Zorgeloos rijden. Vandaag én morgen.</h2><p>Van historie tot laden: wij regelen het, zodat u met vertrouwen de weg op gaat.</p></div>
          <AssuranceShowcase />
          <p className="assuranceTagline">Meer dan auto’s. Een slimmere manier van rijden.</p>
        </div>
        <div className="container">
        <div className="carcheckStatement"><div><p className="eyebrow">Volt &amp; Vroom controle</p><h3>Een vast protocol. Controleerbare bevindingen.</h3></div><p>Per auto leggen we relevante controlepunten en bevindingen vast. De beschikbare gegevens en bevindingen blijven belangrijker dan één badge of totaalscore.</p><a className="textButton" href="/vv-verified">Bekijk onze controleaanpak <span aria-hidden="true">→</span></a></div>
        </div>
      </section>

      <section className="choiceSection" aria-labelledby="keuze-title"><div className="container choiceGrid">
        <div className="choiceCopy"><p className="eyebrow">Drie duidelijke werelden</p><h2 id="keuze-title">Welke auto past bij uw gebruik?</h2><p className="lead">Niet de trend, maar uw ritten, laadmogelijkheden en voorkeuren bepalen wat verstandig is. Wij leggen de verschillen uit en maken de gebruikskosten vergelijkbaar.</p><a className="textButton" href="/keuzehulp">Start de keuzehulp <span aria-hidden="true">→</span></a></div>
        <div className="choiceCards"><article><Image className="choiceIcon" src="/brand/icons/hybride.svg" alt="" width={48} height={48} /><div><h3>Hybride</h3><p>Elektrische ondersteuning met de vertrouwdheid van een brandstofmotor. Geschikt voor wisselende afstanden.</p><a href="/hybride">Lees over hybride <span aria-hidden="true">→</span></a></div></article><article><Image className="choiceIcon" src="/brand/icons/elektrisch.svg" alt="" width={48} height={48} /><div><h3>Elektrisch</h3><p>Stil en direct rijden. Wij tonen bereik, laadmogelijkheden en beschikbare accugezondheid.</p><a href="/elektrisch">Lees over elektrisch <span aria-hidden="true">→</span></a></div></article><article className="iconsChoice"><span className="iconsMark" aria-hidden="true">&amp;</span><div><h3>Icons</h3><p>Bijzondere auto’s met blijvende uitstraling, karakter of verzamelwaarde.</p><a href="/icons">Ontdek Icons <span aria-hidden="true">→</span></a></div></article></div>
      </div></section>

      <section id="voorraad" className="section container">
        <div className="sectionHeading inventoryHeading"><div><p className="eyebrow">Volledig aanbod</p><h2>Actuele voorraad met controleerbare gegevens.</h2></div><p className="sectionIntro">Bij iedere auto tonen we de bekende historie, kilometerstand, technische gegevens en beschikbare accu-informatie. Ontbrekende gegevens benoemen we duidelijk.</p></div>
        {vehicles.length > 0
          ? <div className="vehicleGrid">{vehicles.map(vehicle => <VehicleCard vehicle={vehicle} key={vehicle.id} />)}</div>
          : <div className="inventoryPlaceholder"><div><span>Voorraad in voorbereiding</span><h3>Wilt u als eerste weten welke auto’s beschikbaar komen?</h3><p>Vertel ons wat u zoekt. Wij nemen persoonlijk contact op zodra een passende, gecontroleerde auto beschikbaar is.</p></div><a className="button" href="#advies">Deel uw zoekopdracht <span aria-hidden="true">→</span></a></div>}
      </section>

      <section className="section processSection" aria-labelledby="werkwijze-title"><div className="container">
        <div className="sectionHeading splitHeading"><div><p className="eyebrow">Zo werken wij</p><h2 id="werkwijze-title">Deskundig en persoonlijk. Beslissen in uw tempo.</h2></div><p className="sectionIntro">In drie heldere stappen krijgt u de informatie en aandacht om zelf een goede keuze te maken.</p></div>
        <AnimatedProcessSteps />
      </div></section>

      <section id="advies" className="section contactSection"><div className="container contactLayout">
        <div className="contactCopy"><p className="eyebrow">Persoonlijk advies</p><h2>Vertel ons hoe u rijdt.</h2><p className="lead">Wij leggen uit wat bij uw gebruik past. U krijgt helder advies en persoonlijk contact.</p><div className="contactFacts"><a href="tel:+31619163531"><span>Bel direct</span><strong>0619163531</strong></a><a href="mailto:sales@voltvroom.nl"><span>Stuur een e-mail</span><strong>sales@voltvroom.nl</strong></a><a className="routePlannerLink" href="https://www.google.com/maps/dir/?api=1&destination=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&travelmode=driving" target="_blank" rel="noopener noreferrer" aria-label="Plan uw route naar Volt & Vroom via Google Maps"><span>Plan uw bezoek</span><strong>Euvelgunnerweg 50, Groningen ↗</strong></a></div></div>
        <ContactForm vehicles={contactVehicles} />
      </div></section>
    </main>
    <FloatingContactDock />
    <SiteFooter />
  </>;
}
