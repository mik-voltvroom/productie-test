import { publicPageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { TradeInForm } from "@/components/TradeInForm";
import styles from "./inruilen.module.css";

export const metadata: Metadata = publicPageMetadata({
  title: "Auto inruilen | Persoonlijke inruilindicatie",
  description: "Vraag in drie duidelijke stappen een persoonlijke inruilindicatie aan bij Volt & Vroom in Groningen.",
  alternates: { canonical: "/inruilen" },
});

export default async function InruilenPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; vehicleLabel?: string }>;
}) {
  const params = await searchParams;
  const selectedVehicle = params.vehicleId && params.vehicleLabel
    ? { id: params.vehicleId.slice(0, 120), label: params.vehicleLabel.slice(0, 200) }
    : undefined;

  return <>
    <Header />
    <main className={styles.page}>
      <section className={styles.hero}><div className="container">
        <div className={styles.heroGrid}>
          <div><p className="eyebrow">Persoonlijke inruilindicatie</p><h1>Uw auto inruilen, zonder giswerk.</h1><p>Vertel ons welke auto u rijdt en hoe die ervoor staat. Wij beoordelen kenteken, kilometerstand, onderhoud, uitvoering en staat persoonlijk.</p></div>
          <aside className={styles.heroAside} aria-label="Zo werkt de inruilaanvraag">
            <div><span>1</span><p><strong>Kenteken controleren</strong><small>Openbare voertuiggegevens via RDW</small></p></div>
            <div><span>2</span><p><strong>Staat omschrijven</strong><small>Onderhoud, sleutels en maximaal zes foto’s</small></p></div>
            <div><span>3</span><p><strong>Persoonlijke beoordeling</strong><small>Persoonlijk beoordeeld en duidelijk toegelicht</small></p></div>
          </aside>
        </div>
      </div></section>

      <section className={"container " + styles.layout}>
        <aside className={styles.explanation}>
          <p className="eyebrow">Duidelijk vooraf</p>
          <h2>Een indicatie die bij de echte auto past.</h2>
          <p>De marktwaarde hangt niet alleen af van kenteken en kilometerstand. Daarom kijken we ook naar onderhoud, uitvoering, staat en eventuele schade.</p>
          <ul><li>Uw foto’s worden privé opgeslagen</li><li>Geen verplichting om te verkopen</li><li>Definitieve waarde na controle</li></ul>
        </aside>
        <TradeInForm selectedVehicle={selectedVehicle} />
      </section>
    </main>
    <SiteFooter />
  </>;
}
