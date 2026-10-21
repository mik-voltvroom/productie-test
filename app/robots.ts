import type { MetadataRoute } from "next";
import { canonicalUrl, seoConfiguration } from "@/lib/seo/business";
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    // Permit HTML crawling so noindex can be observed, including on login/token pages.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    ...(seoConfiguration().indexable ? { sitemap: canonicalUrl("/sitemap.xml") } : {}),
  };
}
