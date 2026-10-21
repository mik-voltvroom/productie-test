import { publicPageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { SocialVideoHub } from "@/components/SocialVideoHub";
import { listPublishedSocialVideos } from "@/lib/social-video/repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = publicPageMetadata({
  title: "Uit de praktijk | Volt & Vroom",
  description: "Video's over hybride, elektrisch, VV Verified, CarCheck en onze auto's uit de praktijk.",
  alternates: { canonical: "/uit-de-praktijk" },
});

export default async function UitDePraktijkPage() {
  const videos = await listPublishedSocialVideos({ limit: 50 }).catch(() => []);
  return <>
    <Header />
    <main className="videoHubPage">
      <section className="videoHubHero"><div className="container"><p className="eyebrow">VV Stories · Uit de praktijk</p><h1>Van accudata tot proefrit.<br /><em>Kijk mee in de praktijk.</em></h1><p className="lead">Kijk mee met selectie, techniek, batterijcontrole, rijervaring en auto's die bij Volt &amp; Vroom binnenkomen.</p></div></section>
      <section className="section container"><SocialVideoHub videos={videos} /></section>
    </main>
    <SiteFooter />
  </>;
}
