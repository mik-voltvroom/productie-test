import type { KnowledgeArticle } from "@/lib/marketing-content";
import { canonicalUrl, serializeJsonLd, dealerIdentity } from "@/lib/seo/business";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

export function KnowledgeArticlePage({ article }: { article: KnowledgeArticle }) {
  const articleUrl = canonicalUrl(`/kennis/${encodeURIComponent(article.slug)}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "nl-NL",
    mainEntityOfPage: articleUrl,
    author: { "@type": "Organization", name: "Volt & Vroom" },
    publisher: dealerIdentity(),
  };
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl() },
      { "@type": "ListItem", position: 2, name: "Kennis", item: canonicalUrl("/kennis") },
      { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
    ],
  };

  return <>
    <Header />
    <main className="knowledgeArticle">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbData) }} />
      <header className="knowledgeArticleHero">
        <div className="container knowledgeArticleHeroInner">
          <nav aria-label="Kruimelpad"><a href="/">Home</a><span>/</span><a href="/kennis">Kennis</a></nav>
          <p className="eyebrow">{article.eyebrow}</p>
          <h1>{article.title}</h1>
          <p className="lead">{article.lead}</p>
          <div className="articleMeta"><span>{article.readTime} leestijd</span><span>Bijgewerkt op 4 september 2026</span></div>
        </div>
      </header>
      <div className="container knowledgeArticleLayout">
        <aside>
          <strong>In dit artikel</strong>
          <ol>{article.sections.map((section, index) => <li key={section.title}><a href={`#deel-${index + 1}`}>{section.title}</a></li>)}</ol>
        </aside>
        <article>
          {article.sections.map((section, index) => <section id={`deel-${index + 1}`} key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          </section>)}
          <div className="articleCta">
            <p className="eyebrow">Volgende stap</p>
            <h2>Maak de informatie persoonlijk.</h2>
            <p>Een artikel helpt u voorbereiden. Voor een passende auto blijven uw ritten, laadmogelijkheden en de staat van de specifieke occasion doorslaggevend.</p>
            <a className="button" href={article.relatedLanding.href}>{article.relatedLanding.label} <span aria-hidden="true">→</span></a>
          </div>
          <p className="articleDisclaimer">Deze uitleg is algemeen en vervangt geen inspectie, diagnose of beoordeling van een specifieke auto.</p>
        </article>
      </div>
    </main>
    <SiteFooter />
  </>;
}
