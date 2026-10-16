import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("publieke Volt & Vroom website", () => {
  it("houdt interne VVOS-navigatie buiten de publieke header", () => {
    const header = read("components/Header.tsx");
    expect(header).not.toContain("/dashboard");
    expect(header).toContain("Mobiele navigatie");
    expect(header).toContain("/vv-verified");
    expect(header).toContain("/contact");
  });

  it("biedt een complete adviesroute met privacytoestemming en anti-spamveld", () => {
    const form = read("components/ContactForm.tsx");
    expect(form).toContain('fetch("/api/leads"');
    expect(form).toContain('name="consent"');
    expect(form).toContain('name="website"');
    expect(form).toContain('href="/privacy"');
    expect(form).toContain("telefoonnummer of e-mailadres");
  });

  it("toont Don en Mik als verkoopadviseurs met toegankelijke portretten", () => {
    const contact = read("app/contact/page.tsx");
    const form = read("components/ContactForm.tsx");
    expect(contact).toContain("/team/don-verkoopadviseur.jpg");
    expect(contact).toContain("/team/mik-verkoopadviseur.jpg");
    expect(contact).toContain("Don, verkoopadviseur bij Volt & Vroom");
    expect(contact).toContain("Mik, verkoopadviseur bij Volt & Vroom");
    expect(contact).toContain("Mik of Don neemt persoonlijk contact met u op");
    expect(form).toContain("Mik of Don neemt contact met u op");
  });

  it("gebruikt geen vervallen Automotive-descriptor op de homepage", () => {
    expect(read("app/page.tsx").toUpperCase()).not.toContain("AUTOMOTIVE");
  });

  it("maakt aanbod, bewijs en primaire vervolgstap direct duidelijk", () => {
    const homepage = read("app/page.tsx");
    expect(homepage).toContain("Slim rijden.");
    expect(homepage).toContain("Meer genieten.");
    expect(homepage).toContain("Hybride en elektrisch, helder uitgelegd.");
    expect(homepage).toContain("Bekijk onze auto&apos;s");
    expect(homepage).toContain('href="/keuzehulp" data-vv-event="match_started">Vind mijn ideale auto</a>');
    expect(read("app/frontend-refresh.css")).toContain(".homepageHero h1 em{color:var(--vv-electric)}");
    expect(homepage.indexOf('href="/voorraad"')).toBeLessThan(homepage.indexOf('href="/keuzehulp"'));
  });

  it("houdt de hero compact met gereserveerde beeldruimte en uitsluitend homepage-spacing", () => {
    const styles = read("app/frontend-refresh.css");
    const homepage = read("app/page.tsx");
    expect(styles).toContain(".homepageHero + #uitgelicht > #voorraad{padding-top:64px}");
    expect(styles).toContain(".homepageHero + #uitgelicht > #voorraad{padding-top:48px}");
    expect(styles).toContain(".homepageHero .latestHeroMedia{aspect-ratio:3/2}");
    expect(styles).toContain(".homepageHero .latestHeroMedia img{display:block;object-fit:contain;");
    expect(styles).toContain(".homepageHero .heroVisual{padding:0;min-width:0}");
    expect(styles).toContain(".homepageHero .heroActions .button{min-height:48px;");
    expect(homepage).toContain("width={1920} height={1280} priority");
  });

  it("toont de over-deze-auto-kop nergens op de openbare voertuigpagina", () => {
    const detail = read("app/voorraad/[slug]/page.tsx");

    expect(detail).not.toContain("Over deze auto");
    expect(detail).toContain('aria-label="Voertuigbeschrijving en specificaties"');
    expect(detail).toContain("styles.storyLead");
    expect(detail).toContain("descriptionBlocks(authored)");
    expect(detail).not.toContain("Lees de volledige beschrijving");
  });

  it("toont uitsluitend repository-backed publiceerbare voorraad", () => {
    const homepage = read("app/page.tsx");
    const repository = read("lib/repositories/public-vehicle-repository.ts");
    const publication = read("lib/vehicle/publication.ts");
    expect(homepage).toContain("listPublicVehicles(100)");
    expect(homepage).toContain("const vehicles = await listPublicVehicles(100)");
    expect(homepage).toContain("<InventoryBrowser vehicles={vehicles} showFilters={false}");
    expect(homepage).not.toContain(".slice(0, 6)");
    expect(repository).toContain('vehicle.status === "available"');
    expect(repository).toContain("isPublishedOnWebsite(vehicle)");
    expect(publication).toContain('vehicle.publication?.channels.website === true');
    expect(publication).toContain("validationErrors");
  });

  it("formuleert de selectienorm controleerbaar en zonder onnodige absolute claims", () => {
    const homepage = read("app/page.tsx");
    expect(homepage).not.toContain("Hybrid Intelligence");
    expect(homepage).not.toContain("Altijd dealeronderhouden");
    expect(homepage).not.toContain("Eén eigenaar");
    expect(homepage).toContain("Als familiebedrijf in Groningen");
    expect(homepage).toContain("jonge, volledig onderhouden en compleet uitgevoerde auto’s");
  });

  it("houdt de selectienorm en hero-acties compact op mobiel", () => {
    const css = read("app/public.css");
    const enhancements = read("app/enhancements.css");
    const refresh = read("app/frontend-refresh.css");
    expect(css).toContain(".proofGrid{display:grid;grid-template-columns:repeat(3,1fr)");
    expect(css).toContain(".proofGrid{grid-template-columns:1fr}");
    expect(css).toContain(".hero .actions{display:grid;grid-template-columns:1fr}");
    expect(css).toContain("min-height:44px");
    expect(enhancements).toContain(".mobileActionBar.isHidden");
    expect(refresh).toContain(".featuredRail");
  });

  it("animeert de drie processtappen toegankelijk en slechts eenmaal", () => {
    const homepage = read("app/page.tsx");
    const processSteps = read("components/AnimatedProcessSteps.tsx");
    const refresh = read("app/frontend-refresh.css");

    expect(homepage).not.toContain("<AnimatedProcessSteps />");
    expect(processSteps).toContain("IntersectionObserver");
    expect(processSteps).toContain("observer.disconnect()");
    expect(processSteps).toContain("prefers-reduced-motion: reduce");
    expect(refresh).toContain("@keyframes processStepReveal");
    expect(refresh).toContain("@keyframes processRingDraw");
    expect(refresh).toContain("@media(prefers-reduced-motion:reduce)");
  });

  it("houdt voertuigteksten publiek en aandrijflijnspecifiek", () => {
    const detail = read("app/voorraad/[slug]/page.tsx");
    const card = read("components/VehicleCard.tsx");
    const styles = read("app/globals.css");
    expect(detail).toContain("publicDescription");
    expect(detail).toContain("Specificaties");
    expect(detail).toContain('export const dynamic = "force-dynamic"');
    expect(detail).toContain('type="application/ld+json"');
    expect(detail).toContain("Inclusief alle verplichte kosten.");
    expect(detail).toContain("Opties en uitrusting");
    expect(detail).not.toContain("Hybrid Intelligence");
    expect(detail).not.toContain(">Hybrid data<");
    expect(card).toContain('return "Elektrisch"');
    expect(card).toContain('className="vehicleCardLink"');
    expect(card).toContain("monthlyPriceCents");
    expect(card).toContain('src="/brand/vv-symbol.svg"');
    expect(styles).toContain(".vehicle { display:grid; grid-template-rows:auto 1fr;");
    expect(styles).toContain(".vehicleBody { display:grid; grid-template-rows:auto auto 1fr auto;");
    expect(styles).toContain(".vehicleCardLink,.vehicle,.vehicleBody,.vehicleHeading,.vehicleHeading>div,.vehicleMeta { min-width:0;");
    expect(styles).toContain(".vehicleHeading { display:grid; grid-template-columns:minmax(0,1fr) auto;");
    expect(styles).toContain(".vehicleMeta { margin:12px 0 0; overflow-wrap:anywhere;");
    expect(styles).toContain(".badges { display:flex; flex-wrap:wrap; align-content:flex-start; align-items:flex-start;");
  });

  it("toont geen kenteken in publieke voertuigadvertenties", () => {
    const publicVehicleSurfaces = [
      read("app/voorraad/page.tsx"),
      read("app/voorraad/[slug]/page.tsx"),
      read("components/VehicleCard.tsx"),
      read("components/FeaturedInventoryRail.tsx"),
    ];

    for (const source of publicVehicleSurfaces) {
      expect(source).not.toContain("vehicle.licensePlate");
      expect(source).not.toMatch(/Kenteken\s*\{/i);
    }
  });

  it("biedt een veilige en volledige inruilroute", () => {
    const page = read("app/inruilen/page.tsx");
    const form = read("components/TradeInForm.tsx");
    const lookup = read("app/api/trade-ins/lookup/route.ts");
    const submission = read("app/api/trade-ins/route.ts");
    const repository = read("lib/repositories/trade-in-repository.ts");
    expect(page).toContain("Uw auto inruilen, zonder giswerk");
    expect(form).toContain("Stap 1 van 3");
    expect(form).toContain("maximaal 4 MB");
    expect(form).toContain('fetch("/api/trade-ins"');
    expect(lookup).toContain("lookupRdwVehicle");
    expect(submission).toContain("tradeInSubmissionSchema");
    expect(submission).toContain("MAX_TRADE_IN_PHOTOS");
    expect(repository).toContain("adminDb.batch()");
    expect(repository).toContain('cacheControl: "private, no-store"');
    expect(read("components/Header.tsx")).toContain('href: "/inruilen"');
    expect(read("app/sitemap.ts")).toContain('"/inruilen"');
  });

  it("biedt afzonderlijke landingspagina's, FAQ's en een servergevalideerde keuzehulp", () => {
    expect(read("app/hybride/page.tsx")).toContain("Hybride wanneer dat slimmer is");
    expect(read("app/elektrisch/page.tsx")).toContain("Elektrisch wanneer het klopt");
    expect(read("app/icons/page.tsx")).toContain("Meer karakter.");
    expect(read("app/icons/page.tsx")).toContain("Dezelfde standaard.");
    expect(read("components/SegmentPage.tsx")).toContain("Veelgestelde vragen");
    const match = read("components/MatchForm.tsx");
    expect(match).toContain('fetch("/api/vehicle-finder"');
    expect(match).toContain('fetch("/api/leads"');
    expect(match).toContain('name="consent"');
    expect(match).toContain('name="website"');
    expect(match).toContain("Stap {stepIndex + 1} van {steps.length}");
    expect(match).toContain("We vragen pas om contactgegevens");
    expect(read("app/api/vehicle-finder/route.ts")).toContain("vehicleFinderAnswersSchema.safeParse");
    expect(read("app/api/vehicle-finder/route.ts")).toContain("listPublicVehicles(100)");
  });

  it("publiceert de Icons-visie en koppelt die aan de actuele Icons-voorraad", () => {
    const icons = read("app/icons/page.tsx");
    const inventory = read("app/voorraad/page.tsx");
    const inventoryBrowser = read("components/InventoryBrowser.tsx");
    const vehicleForm = read("components/dashboard/VehicleForm.tsx");
    const homepage = read("app/page.tsx");

    expect(icons).toContain("Onze visie");
    expect(icons).toContain("Bijzonder is pas waardevol wanneer het verhaal klopt");
    expect(icons).toContain("listPublicVehicles(100)");
    expect(icons).toContain("filter(isIconVehicle)");
    expect(icons).toContain('/voorraad?collectie=icons');
    expect(inventory).toContain('collectie === "icons"');
    expect(inventory).toContain("<InventoryBrowser vehicles={vehicles}");
    expect(inventoryBrowser).toContain('categoryFor(vehicle) === category');
    expect(inventoryBrowser).toContain("Hele voorraad");
    expect(inventoryBrowser).toContain("Hybride");
    expect(inventoryBrowser).toContain("Elektrisch");
    expect(inventoryBrowser).toContain("Icons");
    expect(homepage).toContain("vehicles.find(isVvOfferVehicle) ?? vehicles[0]");
    expect(vehicleForm).not.toContain("Collectie<select");
    expect(vehicleForm).not.toContain('value="icons"');
  });

  it("publiceert VV Verified, contact en technische SEO", () => {
    expect(read("app/vv-verified/page.tsx")).toContain("Vertrouwen moet controleerbaar zijn");
    expect(read("app/contact/page.tsx")).toContain("Euvelgunnerweg 50");
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).toContain('"/hybride"');
    expect(sitemap).toContain('"/elektrisch"');
    expect(sitemap).toContain('"/keuzehulp"');
    expect(sitemap).toContain('"/vv-verified"');
    expect(sitemap).toContain('"/contact"');
    expect(read("app/robots.ts")).toContain('disallow: ["/dashboard/", "/api/", "/login"]');
    expect(read("app/page.tsx")).toContain('"@type": "AutoDealer"');
  });

  it("gebruikt het actuele VV-nummer voor bellen, WhatsApp en structured data", () => {
    const publicContactSources = [
      read("app/api/trade-ins/route.ts"),
      read("app/contact/page.tsx"),
      read("app/page.tsx"),
      read("app/privacy/page.tsx"),
      read("components/ContactForm.tsx"),
      read("components/FloatingContactDock.tsx"),
      read("components/Header.tsx"),
      read("components/MatchForm.tsx"),
      read("components/MobileActionBar.tsx"),
      read("components/SiteFooter.tsx"),
      read("components/TradeInForm.tsx"),
    ];

    for (const source of publicContactSources) {
      expect(source).not.toContain("0619163531");
      expect(source).not.toContain("31619163531");
      expect(source).not.toContain("31655000911");
    }

    expect(publicContactSources.join("\n")).toContain("0646585468");
    expect(publicContactSources.join("\n")).toContain("tel:+31646585468");
    expect(read("components/FloatingContactDock.tsx")).toContain('"31646585468"');
    expect(read("components/MobileActionBar.tsx")).toContain('"31646585468"');
    expect(read("apphosting.yaml")).toMatch(/variable: NEXT_PUBLIC_WHATSAPP_NUMBER\s+value: "31646585468"/);
  });

  it("centreert de routeknop zonder de generieke knopopmaak te overschrijven", () => {
    const enhancements = read("app/enhancements.css");
    expect(enhancements).not.toContain(".contactPageCard a,.contactPageCard span");
    expect(enhancements).toContain(".contactPageCard a:not(.button),.contactPageCard>span");
    expect(enhancements).toContain(".contactPageCard>.button{display:flex;align-items:center;justify-content:center;width:100%;padding:12px 20px;margin-top:8px;text-align:center}");
  });

  it("biedt een veilige Google Maps-routeplanner naar de showroom", () => {
    const homepage = read("app/page.tsx");
    const footer = read("components/SiteFooter.tsx");
    const contact = read("app/contact/page.tsx");

    expect(footer).toContain('className="footerMap"');
    expect(footer).toContain("&output=embed");

    for (const source of [homepage, footer, contact]) {
      expect(source).toContain("https://www.google.com/maps/dir/?api=1");
      expect(source).toContain("Euvelgunnerweg%2050%2C%209723%20CW%20Groningen");
      expect(source).toContain('target="_blank"');
      expect(source).toContain('rel="noopener noreferrer"');
    }
  });


  it("biedt herkenbare bel-, WhatsApp- en routeacties", () => {
    const layout = read("app/layout.tsx");
    const styles = read("app/frontend-refresh.css");

    expect(layout).toContain("<FloatingContactDock />");
    expect(layout).toContain("<MobileActionBar />");
    expect(styles).not.toContain("body:has(.homepageHero) .mobileActionBar{display:none!important}");
    for (const source of [read("components/FloatingContactDock.tsx"), read("components/MobileActionBar.tsx")]) {
      expect(source).toContain("PhoneIcon");
      expect(source).toContain("WhatsAppIcon");
      expect(source).toContain("RouteIcon");
      expect(source).toContain("https://wa.me/");
      expect(source).toContain("contactActionPhone");
      expect(source).toContain("contactActionWhatsapp");
      expect(source).toContain("contactActionRoute");
    }
    const refresh = read("app/frontend-refresh.css");
    expect(refresh).toContain(".mobileActionBar .contactActionPhone,.mobileActionBar .contactActionWhatsapp{");
    expect(refresh).toContain(".floatingContactDock .contactActionRoute{");
    expect(refresh).toContain("background:transparent!important;");
    expect(refresh).toContain(".floatingContactDock .dockIcon{");
    expect(read("components/MobileActionBar.tsx")).toContain("routeActionIcon");
    expect(read("components/MobileActionBar.tsx")).toContain('role="dialog"');
    expect(read("components/MobileActionBar.tsx")).toContain("vv_preferred_route_app");
    expect(read("components/MobileActionBar.tsx")).toContain("https://maps.apple.com/");
    expect(read("components/MobileActionBar.tsx")).toContain("https://www.waze.com/ul");
    expect(read("components/MobileActionBar.tsx")).toContain('data-vv-event="route_click"');
    expect(refresh).toContain("color:#075eba!important;");
    expect(refresh).toContain("background:#e6f2ff");
    expect(refresh).toContain(".routeChooserSheet");
    expect(refresh).toContain("@media(prefers-reduced-motion:reduce)");
  });

  it("publiceert een samenhangend SEO- en SEA-contentcluster", () => {
    const content = read("lib/marketing-content.ts");
    const landing = read("components/MarketingLandingPage.tsx");
    const article = read("components/KnowledgeArticlePage.tsx");
    const sitemap = read("app/sitemap.ts");
    const header = read("components/Header.tsx");
    const footer = read("components/SiteFooter.tsx");

    expect(content).toContain("elektrische-auto-kopen-groningen");
    expect(content).toContain("hybride-auto-kopen-groningen");
    expect(content).toContain("auto-inruilen-groningen");
    expect(content).toContain("elektrische-occasion-kopen-controlepunten");
    expect(content).toContain("soh-accu-elektrische-auto-uitleg");
    expect(content).toContain("hybride-of-elektrisch-wat-past-bij-mij");
    expect(landing).toContain('"@type": "Service"');
    expect(landing).toContain("Veelgestelde vragen");
    expect(article).toContain('"@type": "Article"');
    expect(article).toContain('"@type": "BreadcrumbList"');
    expect(read("app/kennis/[slug]/page.tsx")).toContain("generateStaticParams");
    expect(sitemap).toContain("knowledgeArticles");
    expect(sitemap).toContain("marketingLandings");
    expect(header).toContain('href: "/kennis"');
    expect(footer).toContain('href="/kennis"');
  });

  it("laadt de officiële Google Merchant-reviewbadge pas na de primaire pagina", () => {
    const badge = read("components/GoogleMerchantBadge.tsx");
    const layout = read("app/layout.tsx");

    expect(badge).toContain("https://www.gstatic.com/shopping/merchant/merchantwidget.js");
    expect(badge).toContain("merchant_id: 5838389580");
    expect(badge).toContain('position: "RIGHT_BOTTOM"');
    expect(badge).toContain('region: "NL"');
    expect(badge).toContain('strategy="lazyOnload"');
    expect(layout).toContain("<GoogleMerchantBadge />");
  });

  it("maakt kernconversies provider-neutraal meetbaar", () => {
    const analytics = read("components/PublicAnalytics.tsx");
    const tagManager = read("components/GoogleTagManager.tsx");
    const layout = read("app/layout.tsx");
    expect(analytics).toContain("phone_click");
    expect(analytics).toContain("email_click");
    expect(analytics).toContain("whatsapp_click");
    expect(analytics).toContain("route_click");
    expect(analytics).toContain("match_started");
    expect(analytics).toContain("lead_submitted");
    expect(tagManager).toContain("analytics_storage");
    expect(tagManager).toContain('ad_storage: "denied"');
    expect(tagManager).toContain("googletagmanager.com/gtm.js");
    expect(tagManager).toContain("vv:consent-reset");
    expect(layout).toContain("NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID");
  });
});
