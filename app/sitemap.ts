import type { MetadataRoute } from "next";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { knowledgeArticles, marketingLandings } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.voltvroom.nl";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const evergreen = ["", "/voorraad", "/hybride", "/elektrisch", "/icons", "/inruilen", "/keuzehulp", "/vv-verified", "/uit-de-praktijk", "/contact", "/privacy"];
  const marketing = Object.values(marketingLandings).map((page) => `/${page.slug}`);
  const knowledge = ["/kennis", ...knowledgeArticles.map((article) => `/kennis/${article.slug}`)];

  const staticPages: MetadataRoute.Sitemap = [...evergreen, ...marketing, ...knowledge].map((path, index) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: index === 0 || path === "/uit-de-praktijk" || path === "/kennis" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : path === "/privacy" ? 0.2 : marketing.includes(path) ? 0.9 : knowledge.includes(path) ? 0.8 : 0.8,
  }));
  // Match the public detail lookup limit and publication rules; never read raw stock here.
  const vehicles = await listPublicVehicles(100);
  const vehiclePages: MetadataRoute.Sitemap = vehicles.filter(vehicle => Boolean(vehicle.slug)).map(vehicle => ({
    url: `${siteUrl}/voorraad/${encodeURIComponent(vehicle.slug)}`,
    ...(Number.isFinite(Date.parse(vehicle.updatedAt)) ? { lastModified: new Date(vehicle.updatedAt) } : {}),
    changeFrequency: "daily",
    priority: 0.9,
  }));
  return [...staticPages, ...vehiclePages];
}
