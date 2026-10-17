import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./public.css";
import "./enhancements.css";
import "./frontend-refresh.css";
import "./seo-content.css";
import "./social-video.css";
import "./social-video-editor.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FloatingContactDock } from "@/components/FloatingContactDock";
import { GoogleMerchantBadge } from "@/components/GoogleMerchantBadge";
import { GoogleTagManager } from "@/components/GoogleTagManager";
import { MetricoolTracker } from "@/components/MetricoolTracker";
import { MobileActionBar } from "@/components/MobileActionBar";
import { PublicAnalytics } from "@/components/PublicAnalytics";
import { seoConfiguration, privateRobots } from "@/lib/seo/business";
import {AlertPrivacyBoundary} from "@/components/stock-alerts/AlertPrivacyBoundary";

const { origin: siteUrl, indexable: isProductionSite } = seoConfiguration();
const tagManagerContainerId = process.env.VVOS_ENV === "production" && isProductionSite
  ? process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID
  : undefined;
const metricoolHash = process.env.VVOS_ENV === "production" && isProductionSite
  ? process.env.NEXT_PUBLIC_METRICOOL_HASH
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Volt & Vroom | Slim rijden. Meer genieten.",
  description: "Hybride en elektrische occasions, geselecteerd op historie, techniek en dagelijks gebruik. Accudata indien beschikbaar.",
  openGraph: { type: "website", locale: "nl_NL", siteName: "Volt & Vroom", title: "Volt & Vroom | Slim rijden. Meer genieten.", description: "Geselecteerde auto’s. Controleerbare informatie. Persoonlijk advies.", url: "/", images: [{ url: "/editorial/hero-v2.png", width: 1680, height: 945, alt: "Hybride of elektrisch? Volt & Vroom legt uit wat bij uw gebruik past." }] },
  twitter: { card: "summary_large_image", title: "Volt & Vroom", description: "Geselecteerde auto’s. Controleerbare informatie. Persoonlijk advies.", images: ["/editorial/hero-v2.png"] },
  // Public pages inherit the default indexability; do not emit index on 404s.
  ...(isProductionSite ? {} : { robots: privateRobots }),
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nl"><body><AuthProvider>{children}</AuthProvider><AlertPrivacyBoundary><PublicAnalytics /><GoogleTagManager containerId={tagManagerContainerId} /><MetricoolTracker hash={metricoolHash} /><FloatingContactDock /><MobileActionBar /><GoogleMerchantBadge /></AlertPrivacyBoundary></body></html>;
}
