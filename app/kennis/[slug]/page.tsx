import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo/metadata";
import { notFound } from "next/navigation";
import { KnowledgeArticlePage } from "@/components/KnowledgeArticlePage";
import { getArticle, knowledgeArticles } from "@/lib/marketing-content";

export function generateStaticParams() {
  return knowledgeArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return publicPageMetadata({
    title: `${article.title} | Volt & Vroom`,
    description: article.description,
    alternates: { canonical: `/kennis/${article.slug}` },
    openGraph: { title: article.title, description: article.description, url: `/kennis/${article.slug}`, type: "article", publishedTime: article.publishedAt, modifiedTime: article.updatedAt },
  });
}

export default async function KennisArtikelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  return <KnowledgeArticlePage article={article} />;
}
