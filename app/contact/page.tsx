import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactForm } from "@/components/ContactForm";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { contactContext, contactVehicle, todayInGroningen } from "@/lib/contact/business";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact & route | Volt & Vroom Groningen",
  description: "Neem contact op met Volt & Vroom aan de Euvelgunnerweg 50 in Groningen voor persoonlijk advies over hybride en elektrische occasions.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: {
  searchParams: Promise<{ vehicleId?: string | string[]; intent?: string | string[] }>;
}) {
  const vehicles = (await listPublicVehicles(100)).map(contactVehicle);
  const context = contactContext(vehicles, await searchParams);
  return <>
    <Header />
    <main className="contactPage"><div className="container">
      <div className="contactPageGrid">
        <div><p className="eyebrow">Volt & Vroom Groningen</p><h1>Kom langs of neem direct contact op.</h1><p className="lead">Wilt u een auto bekijken, uw situatie bespreken of gewoon weten welke aandrijflijn logisch is? Neem contact op. We houden het persoonlijk en duidelijk.</p><div className="contactDetails"><article><h2>Adres</h2><p>Euvelgunnerweg 50<br />9723 CW Groningen</p></article><article><h2>Contact</h2><p><a href="tel:+31646585468" data-vv-event="phone_click">0646585468</a><br /><a href="mailto:sales@voltvroom.nl" data-vv-event="email_click">sales@voltvroom.nl</a></p></article><article><h2>Bezoek plannen</h2><p>Plan uw route vooraf of neem contact op wanneer u speciaal voor een voertuig komt. Zo zorgen we dat er tijd is voor uitleg en een proefrit.</p></article></div></div>
        <aside className="contactPageCard"><strong>Route naar Volt & Vroom</strong><iframe title="Volt & Vroom op Google Maps — Euvelgunnerweg 50, Groningen" src="https://www.google.com/maps?q=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&output=embed" width="600" height="360" style={{ width: "100%", height: "360px", border: 0, borderRadius: "12px" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /><a className="button" href="https://www.google.com/maps/dir/?api=1&destination=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&travelmode=driving" target="_blank" rel="noopener noreferrer" data-vv-event="route_click">Plan route via Google Maps ↗</a><span>Euvelgunnerweg 50 · Groningen</span></aside>
      </div>
      <section className="section" id="aanvraag"><div className="sectionHeading splitHeading"><div><p className="eyebrow">Persoonlijk advies</p><h2>Vertel wat u zoekt.</h2></div><p className="sectionIntro">Laat uw telefoonnummer of e-mailadres achter. Mik neemt persoonlijk contact met u op; u hoeft nog geen specifieke auto te hebben gekozen. Een proefritafspraak staat pas vast nadat wij deze hebben bevestigd.</p></div><ContactForm key={`${context.initialInterest}:${context.initialVehicleId}`} vehicles={vehicles} {...context} minimumDate={todayInGroningen()} /></section>
    </div></main>
    <SiteFooter />
  </>;
}
