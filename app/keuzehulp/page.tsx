import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { MatchForm } from "@/components/MatchForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Voertuigkeuzehulp | Welke auto past bij u?", description: "Beantwoord vijf korte vragen over budget, kilometers, laden en gebruik en ontdek welke actuele Volt & Vroom-auto's bij u passen.", alternates: { canonical: "/keuzehulp" } };

export default function KeuzehulpPage() {
  return <><Header /><main className="matchPage"><section className="matchHero"><div className="container"><p className="eyebrow">Intelligente voertuigkeuzehulp</p><h1>Welke auto past bij uw gebruik?</h1><p className="lead">Vijf korte vragen koppelen uw voorkeuren aan onze actuele, beschikbare voorraad.</p><ul className="trustList"><li>Uitslag na vijf vragen</li><li>Gebaseerd op actuele voorraad</li><li>Vrijblijvend</li></ul></div></section><section className="container matchLayout"><aside><p className="eyebrow">Waarom deze vragen?</p><h2>De juiste auto begint bij uw ritten.</h2><p>Budget, jaarkilometrage, laadmogelijkheden en dagelijks gebruik bepalen samen welke aandrijflijn en auto logisch zijn.</p><div className="matchAsidePoints"><span><strong>Laden</strong>Thuis, op het werk, openbaar of niet</span><span><strong>Gebruik</strong>Stad, woon-werk, lange ritten of gemengd</span><span><strong>Advies</strong>Transparant gekoppeld aan actuele auto&apos;s</span></div></aside><MatchForm /></section></main><SiteFooter /></>;
}
