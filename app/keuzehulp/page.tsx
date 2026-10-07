import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { MatchForm } from "@/components/MatchForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Hybrid & EV Match | Welke auto past bij u?", description: "Beantwoord zeven vragen over uw ritten, laden en budget en ontdek of full hybrid, plug-inhybride of elektrisch waarschijnlijk het beste past.", alternates: { canonical: "/keuzehulp" } };

export default function KeuzehulpPage() {
  return <><Header /><main className="matchPage"><section className="matchHero"><div className="container"><p className="eyebrow">Hybrid &amp; EV Match</p><h1>Welke aandrijflijn past bij uw gebruik?</h1><p className="lead">Zeven vragen vertalen uw gebruik naar een passende aandrijflijn.</p><ul className="trustList"><li>Uitslag na zeven vragen</li><li>Gebaseerd op uw gebruik</li><li>Vrijblijvend</li></ul></div></section><section className="container matchLayout"><aside><p className="eyebrow">Waarom deze vragen?</p><h2>De juiste auto begint bij uw ritten.</h2><p>Een EV, full hybrid of plug-inhybride kan alleen verstandig worden beoordeeld in de context van uw werkelijke gebruik.</p><div className="matchAsidePoints"><span><strong>Laden</strong>Structureel beschikbaar of niet</span><span><strong>Afstand</strong>Dagelijkse rit en lange reizen</span><span><strong>Kosten</strong>Budget, gebruik en inruil</span></div></aside><MatchForm /></section></main><SiteFooter /></>;
}
