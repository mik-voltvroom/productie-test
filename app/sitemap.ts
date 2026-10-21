import type { MetadataRoute } from "next";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { knowledgeArticles, marketingLandings } from "@/lib/marketing-content";
import { canonicalUrl, seoConfiguration } from "@/lib/seo/business";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!seoConfiguration().indexable) return [];
  const evergreen = ["", "/voorraad", "/hybride", "/elektrisch", "/icons", "/inruilen", "/keuzehulp", "/vv-verified", "/uit-de-praktijk", "/contact", "/privacy"];
  const marketing = Object.values(marketingLandings).map((page) => `/${page.slug}`);
  const knowledge = ["/kennis", ...knowledgeArticles.map((article) => `/kennis/${article.slug}`)];

  const staticPages: MetadataRoute.Sitemap = [...evergreen, ...marketing, ...knowledge].map((path, index) => ({
    url: canonicalUrl(path || "/"),
    changeFrequency: index === 0 || path === "/uit-de-praktijk" || path === "/kennis" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : path === "/privacy" ? 0.2 : marketing.includes(path) ? 0.9 : knowledge.includes(path) ? 0.8 : 0.8,
  }));
  const vehicles = await listPublicVehicles();
  if (new Set(vehicles.map(vehicle => vehicle.slug)).size !== vehicles.length) throw new Error("Ambiguous public vehicle slugs");
  const vehiclePages: MetadataRoute.Sitemap = vehicles.filter(vehicle => Boolean(vehicle.slug)).map(vehicle => ({
    url: canonicalUrl(`/voorraad/${encodeURIComponent(vehicle.slug)}`),
    // Import updatedAt is also refreshed by source operations; it is not a content revision date.
    changeFrequency: "daily",
    priority: 0.9,
  }));
  return [...staticPages, ...vehiclePages];
}
