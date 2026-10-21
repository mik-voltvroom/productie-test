import type { MarketingLanding } from "@/lib/marketing-content";
import { canonicalUrl, serializeJsonLd, dealerIdentity } from "@/lib/seo/business";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

export function MarketingLandingPage({ page }: { page: MarketingLanding }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.heading,
    description: page.description,
    areaServed: { "@type": "City", name: "Groningen" },
    provider: dealerIdentity(),
    url: canonicalUrl(`/${encodeURIComponent(page.slug)}`),
  };

  return <>
    <Header />
    <main className="marketingPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <section className="marketingHero">
        <div className="container marketingHeroGrid">
          <div>
            <p className="eyebrow">{page.eyebrow}</p>
            <h1>{page.heading}</h1>
            <p className="lead">{page.lead}</p>
            <div className="actions">
              <a className="button" href={page.primary.href} data-vv-event={page.primary.event}>{page.primary.label} <span aria-hidden="true">→</span></a>
              <a className="textButton" href={page.secondary.href}>{page.secondary.label}</a>
            </div>
          </div>
          <aside className="marketingPromise" aria-label="Wat u van Volt & Vroom kunt verwachten">
            <span>Volt &amp; Vroom · Groningen</span>
            <strong>{page.promise}</strong>
            <ul>{page.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
          </aside>
        </div>
      </section>

      <section className="section container">
        <div className="sectionHeading splitHeading">
          <div><p className="eyebrow">Verstandig vergelijken</p><h2>Informatie die helpt om te kiezen.</h2></div>
          <p className="sectionIntro">We schrijven voor mensen die een auto willen begrijpen vóór ze beslissen. Daarom koppelen we techniek aan dagelijks gebruik.</p>
        </div>
        <div className="marketingContentGrid">{page.sections.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </section>

      <section className="section marketingSteps">
        <div className="container">
          <div className="sectionHeading"><p className="eyebrow">Zo werkt het</p><h2>Van zoekvraag naar passende vervolgstap.</h2></div>
          <ol>{page.steps.map((step, index) => <li key={step.title}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="section container">
        <div className="sectionHeading splitHeading">
          <div><p className="eyebrow">Veelgestelde vragen</p><h2>Duidelijk vóór u contact opneemt.</h2></div>
          <p className="sectionIntro">Staat uw situatie er niet tussen? Bel, WhatsApp of gebruik de keuzehulp voor een persoonlijk antwoord.</p>
        </div>
        <div className="faqGrid">{page.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className="section container marketingClosing">
        <div><p className="eyebrow">Persoonlijk advies</p><h2>{page.closingTitle}</h2></div>
        <div><p className="lead">{page.closingText}</p><a className="button" href={page.primary.href} data-vv-event={page.primary.event}>{page.primary.label} <span aria-hidden="true">→</span></a></div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
