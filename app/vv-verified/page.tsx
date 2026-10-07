import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PlacementSocialVideos } from "@/components/PlacementSocialVideos";
import { SiteFooter } from "@/components/SiteFooter";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "VV Verified | Zo controleert Volt & Vroom een occasion",
  description: "Bekijk hoe Volt & Vroom historie, kilometerstand, techniek, hoogvoltaccu, onderhoud en praktijkdata controleert voordat een auto wordt gepubliceerd.",
  alternates: { canonical: "/vv-verified" },
};

const checks = [
  ["Historie", "Herkomst, onderhoudsdocumentatie en relevante voertuiggegevens worden gecontroleerd en tegenstrijdigheden worden uitgezocht."],
  ["Kilometerstand", "Het kilometerverloop moet logisch en aantoonbaar zijn voordat de auto als gecontroleerd aanbod wordt gepresenteerd."],
  ["Techniek", "Diagnose, storingen, banden, remmen en bekende modelaandachtspunten worden beoordeeld voordat publicatie plaatsvindt."],
  ["Hoogvoltaccu", "Bij hybride en elektrische auto’s brengen we de beschikbare accudata in beeld en voeren we waar relevant een EOBD/SOH-controle uit."],
  ["Onderhoud", "We maken zichtbaar wat aantoonbaar is uitgevoerd en welke werkzaamheden nog nodig zijn voor aflevering."],
  ["Praktijk", "Verbruik, range en gebruikskosten worden niet mooier gemaakt dan ze zijn; we leggen uit wat realistisch is voor normaal gebruik."],
  ["Presentatie", "Prijs, kilometerstand, aandrijving en technische onderbouwing moeten kloppen voordat de auto online verschijnt."],
  ["Eindbeoordeling", "Alle bevindingen worden samengebracht in één dossier. Bij een blokkerend risico wordt de auto niet als VV Verified gepubliceerd."],
];

export default function VVVerifiedPage() {
  return <>
    <Header />
    <main>
      <section className="verificationHero"><div className="container verificationHeroGrid">
        <div><p className="eyebrow">VV Verified</p><h1>Vertrouwen moet controleerbaar zijn.</h1><p className="lead">Een mooie advertentie is niet genoeg. Daarom laten we per auto zien welke informatie beschikbaar en gecontroleerd is—van historie en kilometerstand tot techniek, onderhoud en accudata.</p><div className="actions"><a className="button" href="/#voorraad">Bekijk aanbod <span aria-hidden="true">→</span></a><a className="button secondary" href="/keuzehulp">Welke auto past bij mij?</a></div></div>
        <aside className="verificationPanel"><strong>Geen score zonder bewijs.</strong><p>VV Verified is geen los marketinglabel. De onderliggende meetpunten, documenten en toelichting blijven leidend. Een auto met een onopgelost blokkerend risico wordt niet als gecontroleerd aanbod gepubliceerd.</p></aside>
      </div></section>

      <section className="section container"><div className="sectionHeading splitHeading"><div><p className="eyebrow">Onze controle</p><h2>Van historie tot eindbeoordeling: onze vaste controlepunten.</h2></div><p className="sectionIntro">Niet iedere auto vraagt exact dezelfde meting. Wel moet iedere gepubliceerde claim aansluiten op de beschikbare voertuiggegevens.</p></div><div className="verificationSteps">{checks.map(([title,text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="evidenceBand"><div className="container evidenceBandGrid"><div><p className="eyebrow">Evidence first</p><h2>Wat we niet kunnen onderbouwen, beloven we niet.</h2><p>Bij Volt & Vroom hoort transparantie ook te betekenen dat onzekerheden zichtbaar blijven. Een ontbrekende meting wordt niet vervangen door een schatting en een folderwaarde wordt niet als praktijkwaarde gepresenteerd.</p></div><ul className="evidenceList"><li>Aantoonbare historie boven verkooppraat.</li><li>Gemeten accudata boven aannames.</li><li>Praktijkinformatie naast fabrieksgegevens.</li><li>Openstaande aandachtspunten vóór de koop bespreken.</li><li>Documentatie en meetresultaten onderdeel van het voertuigdossier.</li></ul></div></section>

      <PlacementSocialVideos placement="carCheck" eyebrow="VV Stories · Bewijs in beeld" title="Bekijk hoe we controleren." intro="Technische uitlegvideo's worden pas hier getoond nadat ze in VVOS zijn beoordeeld en voor deze bewijslaag zijn gepubliceerd." />

      <section className="section container"><div className="sectionHeading splitHeading"><div><p className="eyebrow">CarCheck</p><h2>CarCheck verdiept het voertuigdossier.</h2></div><p className="sectionIntro">CarCheck bouwt voort op VV Verified met meer inspectiepunten en traceerbaar bewijs. We publiceren alleen gegevens die voor de specifieke auto beschikbaar en gecontroleerd zijn.</p></div></section>
    </main>
    <SiteFooter />
  </>;
}
