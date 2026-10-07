import Image from "next/image";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { HomepageSocialFeed } from "@/components/HomepageSocialFeed";
import { InventoryBrowser } from "@/components/InventoryBrowser";
import { SiteFooter } from "@/components/SiteFooter";
import { VehicleHighlights } from "@/components/vehicles/VehicleHighlights";
import { eur } from "@/lib/format";
import { centsToEuros } from "@/lib/money";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { isVvOfferVehicle } from "@/lib/vehicle/business";

// De homepage toont dezelfde live Firestore-voorraad als /voorraad.
// Forceer dynamische rendering zodat een tijdens de build lege voorraad niet
// als statische homepage in de App Hosting-cache blijft hangen.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const vehicles = await listPublicVehicles(100);
  const latestVehicle = vehicles.find(isVvOfferVehicle) ?? vehicles[0];

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "AutoDealer", name: "Volt & Vroom", description: "Onafhankelijke specialist voor zorgvuldig geselecteerde hybride en elektrische occasions.", url: "https://www.voltvroom.nl", telephone: "+31646585468", email: "sales@voltvroom.nl", address: { "@type": "PostalAddress", streetAddress: "Euvelgunnerweg 50", postalCode: "9723 CW", addressLocality: "Groningen", addressCountry: "NL" }, areaServed: ["Groningen", "Drenthe", "Friesland"] }) }} />
    <a className="skipLink" href="#inhoud">Ga naar de inhoud</a>
    <Header />
    <main id="inhoud">
      <section className="heroShell heroShellRefresh homepageHero" aria-labelledby="hero-title">
        <div className="container hero heroRefresh">
          <div className="heroCopy">
            <p className="eyebrow">Volt &amp; Vroom · Groningen</p>
            <h1 id="hero-title"><em>Slim rijden.</em><br />Meer genieten.</h1>
            <p className="heroDescriptor">Expert in hybride en elektrisch rijden.</p>
            <p className="heroEvidence">Prijs, kilometerstand en uitvoering direct inzichtelijk.</p>
            <div className="actions heroActions">
              <a className="button heroPrimaryButton" href="/voorraad">Bekijk de voorraad <span aria-hidden="true">→</span></a>
              <a className="button secondary" href="/keuzehulp">Doe de keuzetest</a>
            </div>
          </div>
          <div className="heroVisual heroVisualRefresh">
            {latestVehicle ? <a className="latestHeroVehicle" href={`/voorraad/${latestVehicle.slug}`} aria-label={`Bekijk ${latestVehicle.brand} ${latestVehicle.model}`}>
              <div className="latestHeroMedia">
                {latestVehicle.images[0]
                  ? <Image src={latestVehicle.images[0]} alt={`${latestVehicle.brand} ${latestVehicle.model} ${latestVehicle.trim}`} width={1920} height={1440} priority sizes="(max-width: 900px) calc(100vw - 32px), (max-width: 1220px) calc((100vw - 104px) / 2), 558px" unoptimized={!latestVehicle.images[0].startsWith("https://media-eigenwebsiteincrementeel.export.dv.nl/")} />
                  : <div className="latestHeroFallback"><span>V&amp;V</span></div>}
              </div>
              <div className="latestHeroInfo">
                <div><span>{latestVehicle.driveType === "electric" ? "Elektrisch" : latestVehicle.driveType === "plug-in-hybrid" ? "Plug-in hybride" : latestVehicle.driveType === "full-hybrid" ? "Hybride" : latestVehicle.fuelType}</span><h2>{latestVehicle.brand} {latestVehicle.model}</h2><VehicleHighlights trim={latestVehicle.trim} compact /></div>
                <strong>{latestVehicle.priceCents > 0 ? eur.format(centsToEuros(latestVehicle.priceCents)) : "Prijs op aanvraag"}</strong>
              </div>
            </a> : <div className="heroEmpty"><span>Volt &amp; Vroom</span><p>Nieuw aanbod in voorbereiding.</p></div>}
          </div>
        </div>
      </section>

      <div id="uitgelicht">
      <section id="voorraad" className="section container">
        <div className="sectionHeading inventoryHeading"><div><p className="eyebrow">Actueel aanbod</p><h2>Ontdek onze occasions.</h2></div><a className="textButton" href="/voorraad">Bekijk alle auto’s <span aria-hidden="true">→</span></a></div>
        {vehicles.length > 0
          ? <InventoryBrowser vehicles={vehicles} showFilters={false} />
          : <div className="inventoryPlaceholder"><div><span>Voorraad in voorbereiding</span><h3>Wilt u als eerste weten welke auto’s beschikbaar komen?</h3><p>Vertel ons wat u zoekt. Wij nemen persoonlijk contact op zodra een passende auto beschikbaar is.</p></div><a className="button" href="#advies">Deel uw zoekopdracht <span aria-hidden="true">→</span></a></div>}
      </section>
      </div>

      <HomepageSocialFeed />



      <section className="choiceSection" aria-labelledby="keuze-title"><div className="container choiceGrid">
        <div className="choiceCopy"><p className="eyebrow">Hulp bij kiezen</p><h2 id="keuze-title">Welke auto past bij uw gebruik?</h2><p className="lead">Hybride of elektrisch? Ontdek wat past bij uw ritten en laadmogelijkheden.</p><a className="textButton" href="/keuzehulp">Start de keuzehulp <span aria-hidden="true">→</span></a></div>
        <div className="choiceCards"><article><Image className="choiceIcon" src="/brand/icons/hybride.svg" alt="" width={48} height={48} /><div><h3>Hybride</h3><p>Elektrisch ondersteund, vertrouwd op benzine.</p><a href="/hybride">Lees over hybride <span aria-hidden="true">→</span></a></div></article><article><Image className="choiceIcon" src="/brand/icons/elektrisch.svg" alt="" width={48} height={48} /><div><h3>Elektrisch</h3><p>Volledig elektrisch, stil en direct.</p><a href="/elektrisch">Lees over elektrisch <span aria-hidden="true">→</span></a></div></article><article className="iconsChoice"><span className="iconsMark" aria-hidden="true">&amp;</span><div><h3>Icons</h3><p>Bijzondere auto’s met karakter.</p><a href="/icons">Ontdek Icons <span aria-hidden="true">→</span></a></div></article></div>
      </div></section>



      <section id="advies" className="section contactSection homepageContact"><div className="container">
        <div className="contactCopy"><p className="eyebrow">Persoonlijk advies</p><h2>Vertel ons hoe u rijdt.</h2><p className="lead">Een vraag of een proefrit plannen? Neem contact met ons op.</p><div className="contactFacts"><a href="tel:+31646585468"><span>Bel direct</span><strong>0646585468</strong></a><a href="mailto:sales@voltvroom.nl"><span>Stuur een e-mail</span><strong>sales@voltvroom.nl</strong></a><a className="routePlannerLink" href="https://www.google.com/maps/dir/?api=1&destination=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&travelmode=driving" target="_blank" rel="noopener noreferrer" aria-label="Plan uw route naar Volt & Vroom via Google Maps"><span>Plan uw bezoek</span><strong>Euvelgunnerweg 50, Groningen ↗</strong></a></div></div>
        <a className="button" href="/contact">Neem contact op <span aria-hidden="true">→</span></a>
      </div></section>
    </main>
    <SiteFooter />
  </>;
}
