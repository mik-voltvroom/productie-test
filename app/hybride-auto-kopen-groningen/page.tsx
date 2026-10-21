import { publicPageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { MarketingLandingPage } from "@/components/MarketingLandingPage";
import { marketingLandings } from "@/lib/marketing-content";

const page = marketingLandings.hybride;
export const metadata: Metadata = publicPageMetadata({ title: page.title, description: page.description, alternates: { canonical: `/${page.slug}` }, openGraph: { title: page.title, description: page.description, url: `/${page.slug}`, type: "website" } });
export default function HybrideAutoKopenGroningenPage() { return <MarketingLandingPage page={page} />; }
