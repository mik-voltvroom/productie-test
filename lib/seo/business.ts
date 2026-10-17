import { siteConfiguration, type SiteEnvironment } from "@/lib/environment/business";
import type { Vehicle } from "@/types";
import { publicStockCondition } from "@/lib/vehicle/business";

export function seoConfiguration(env: SiteEnvironment = process.env) {
  return siteConfiguration(env);
}

export const privateRobots = { index: false, follow: false, noarchive: true } as const;

/** Inputs are application paths; external URLs are never accepted. */
export function canonicalUrl(path = "/", env: SiteEnvironment = process.env): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) throw new Error("Expected a local canonical path");
  const url = new URL(path, seoConfiguration(env).origin);
  url.search = ""; url.hash = "";
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.href;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function dealerIdentity(env: SiteEnvironment = process.env) {
  return { "@type": "AutoDealer", "@id": `${canonicalUrl("/", env)}#dealer`, name: "Volt & Vroom",
    url: canonicalUrl("/", env), telephone: "+31646585468", email: "sales@voltvroom.nl",
    address: { "@type": "PostalAddress", streetAddress: "Euvelgunnerweg 50", postalCode: "9723 CW", addressLocality: "Groningen", addressCountry: "NL" } };
}

/** Metadata is plain text, never HTML or provider markup. Bound only extreme input. */
export function seoText(input: unknown, max = 120): string {
  const text = typeof input === "string" ? input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim() : "";
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "").trimEnd() + "…";
}

export function vehicleSeo(vehicle: Vehicle, env: SiteEnvironment = process.env) {
  const brand = seoText(vehicle.brand, 60), model = seoText(vehicle.model, 80);
  const name = model.toLocaleLowerCase("nl-NL").startsWith(brand.toLocaleLowerCase("nl-NL") + " ") ? model : [brand, model].filter(Boolean).join(" ");
  const trim = seoText(vehicle.trim, 90);
  const year = Number.isInteger(vehicle.year) && vehicle.year >= 1886 && vehicle.year <= 2100 ? vehicle.year : undefined;
  const mileage = Number.isFinite(vehicle.mileageKm) && vehicle.mileageKm >= 0 ? vehicle.mileageKm : undefined;
  const price = Number.isSafeInteger(vehicle.priceCents) && vehicle.priceCents > 0 ? vehicle.priceCents : undefined;
  const url = canonicalUrl(`/voorraad/${encodeURIComponent(vehicle.slug)}`, env);
  const title = [name, trim, year].filter(Boolean).join(" ") + " | Volt & Vroom";
  const facts = [trim, year, mileage === undefined ? "" : `${new Intl.NumberFormat("nl-NL").format(mileage)} km`,
    price === undefined ? "Prijs op aanvraag" : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(price / 100)].filter(Boolean).join(" · ");
  const description = `${name}: ${facts}. Bekijk de beschikbare gegevens bij Volt & Vroom in Groningen en plan een proefrit.`;
  // The repository has already applied the provider's public photo contract.
  const images = vehicle.images.filter(image => { try { const url = new URL(image); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; } });
  const issues = [
    ...(!brand || !model ? ["Merk of model ontbreekt."] : []), ...(!trim ? ["Uitvoering ontbreekt."] : []),
    ...(year === undefined ? ["Geldig bouwjaar ontbreekt."] : []), ...(mileage === undefined ? ["Geldige kilometerstand ontbreekt."] : []),
    ...(price === undefined ? ["Geen geldige positieve prijs: geen Offer."] : []), ...(!images.length ? ["Publieke HTTPS-foto ontbreekt."] : []),
    ...(title.length > 70 ? ["Controleer de lange title in de preview; dit is een redactiewaarschuwing."] : []),
    ...(description.length > 180 ? ["Controleer de lange description in de preview; dit is een redactiewaarschuwing."] : []),
  ];
  const mainImage = images[0] === vehicle.images[0] ? images[0] : undefined;
  return { name, trim, year, mileage, price, url, title, description, images, mainImage, issues };
}

/** Accept only a vehicle from the public repository, with the visible description. */
export function vehicleSchema(vehicle: Vehicle, visibleDescription: string, env: SiteEnvironment = process.env) {
  const seo = vehicleSeo(vehicle, env);
  return { "@context": "https://schema.org", "@type": ["Car", "Product"],
    "@id": `${canonicalUrl("/voorraad", env)}#vehicle-${encodeURIComponent(vehicle.id)}`,
    name: [seo.name, seo.trim].filter(Boolean).join(" "), url: seo.url, sku: vehicle.id,
    brand: { "@type": "Brand", name: seoText(vehicle.brand, 60) }, model: seoText(vehicle.model, 80),
    image: seo.images, description: visibleDescription,
    ...(seo.year === undefined ? {} : { vehicleModelDate: String(seo.year) }),
    ...(seo.mileage === undefined ? {} : { mileageFromOdometer: { "@type": "QuantitativeValue", value: seo.mileage, unitCode: "KMT" } }),
    itemCondition: publicStockCondition.schema,
    ...(seo.price !== undefined && vehicle.status === "available" ? { offers: { "@type": "Offer", url: seo.url,
      price: (seo.price / 100).toFixed(2), priceCurrency: "EUR", availability: "https://schema.org/InStock", seller: dealerIdentity(env) } } : {}),
  };
}

export function seoSnapshot(vehicles: readonly Vehicle[], env: SiteEnvironment, checkedAt: string) {
  const config = seoConfiguration(env);
  const slugs = new Map<string, number>();
  for (const vehicle of vehicles) slugs.set(vehicle.slug, (slugs.get(vehicle.slug) ?? 0) + 1);
  return { checkedAt, environment: env.VVOS_ENV ?? "niet geconfigureerd", origin: config.origin, indexable: config.indexable,
    source: "Lokaal berekend uit publieke repository en code", liveHttp: "Niet uitgevoerd", searchConsole: "Niet gekoppeld", pageSpeed: "Niet gekoppeld",
    routeFamilies: [
      { name: "Publieke inhoud", policy: config.indexable ? "Indexeerbaar" : "Noindex", sitemap: config.indexable },
      { name: "Publieke voertuigdetail", policy: config.indexable ? "Indexeerbaar indien gepubliceerd; anders 404" : "Noindex", sitemap: config.indexable },
      { name: "Mobilox ID", policy: "307 naar actuele publieke slug met attributie", sitemap: false },
      { name: "Dashboard en interne rapporten", policy: "Sessie/rechten vereist; noindex", sitemap: false },
      { name: "Login", policy: "Noindex", sitemap: false },
      { name: "Tokenportaal", policy: "Noindex; huidige productiepagina geeft 404", sitemap: false },
      { name: "API", policy: "Geen sitemap; robots disallow is geen toegangscontrole", sitemap: false },
    ],
    vehicles: vehicles.map(vehicle => {
      const seo = vehicleSeo(vehicle, env), schema = vehicleSchema(vehicle, vehicle.description ?? "", env);
      const uniqueSlug = Boolean(vehicle.slug) && slugs.get(vehicle.slug) === 1;
      return { id: vehicle.id, status: "Publiek in deze repositorymomentopname", url: seo.url, title: seo.title, description: seo.description,
        image: seo.mainImage, schema: "Car + Product", offer: Boolean(schema.offers), sitemap: config.indexable && uniqueSlug,
        issues: [...seo.issues, ...(!uniqueSlug ? ["P1: ontbrekende of dubbele slug; herstel de bronidentiteit vóór publicatie."] : [])], checkedAt };
    }),
  };
}
