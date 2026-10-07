import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { knowledgeArticles } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Kennis over hybride en elektrische occasions | Volt & Vroom",
  description: "Praktische uitleg over elektrische occasions, accugezondheid, laden en de keuze tussen hybride en elektrisch.",
  alternates: { canonical: "/kennis" },
  openGraph: { title: "Volt & Vroom Kennis", description: "Begrijp techniek en gebruik voordat u een occasion kiest.", url: "/kennis", type: "website" },
};

export default function KennisPage() {
  return <>
    <Header />
    <main className="knowledgeHub">
      <section className="knowledgeHubHero"><div className="container"><p className="eyebrow">Volt &amp; Vroom Kennis</p><h1>Begrijpen vóór u kiest.</h1><p className="lead">Praktische uitleg over aandrijflijnen, accudata, laden en occasioncontrole—altijd in de context van uw gebruik.</p></div></section>
      <section className="section container">
        <div className="sectionHeading splitHeading"><div><p className="eyebrow">Nieuw in de kennisbank</p><h2>Antwoorden op vragen uit de showroom.</h2></div><p className="sectionIntro">Gebruik de artikelen om gerichter te vergelijken of als voorbereiding op een persoonlijk gesprek.</p></div>
        <div className="knowledgeGrid">{knowledgeArticles.map((article) => <article key={article.slug}><span>{article.eyebrow}</span><h2><a href={`/kennis/${article.slug}`}>{article.title}</a></h2><p>{article.description}</p><div><small>{article.readTime} leestijd</small><a href={`/kennis/${article.slug}`}>Lees artikel <span aria-hidden="true">→</span></a></div></article>)}</div>
      </section>
      <section className="section container knowledgeHubLinks"><div><p className="eyebrow">Verder vergelijken</p><h2>Van uitleg naar een passende auto.</h2></div><div><a href="/elektrische-auto-kopen-groningen">Elektrische auto kopen in Groningen →</a><a href="/hybride-auto-kopen-groningen">Hybride auto kopen in Groningen →</a><a href="/auto-inruilen-groningen">Auto inruilen in Groningen →</a></div></section>
    </main>
    <SiteFooter />
  </>;
}
