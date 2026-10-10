import { numericSourceSpecs, textSourceSpecs, type SourceSpecifications } from "@/lib/vehicle/source-specifications";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { slugify, validateVehicle } from "@/lib/business";
import { eurosToCents } from "@/lib/money";
import { MAX_IMPORTED_PHOTOS } from "@/lib/vehicle/editorial";
import type { DriveType, Vehicle, VehicleRoadTax } from "@/types";

type XmlRecord = Record<string, unknown>;
type ProviderAction = "add" | "change" | "delete";

export interface HexonMutation {
  action: "upsert" | "archive";
  providerAction: ProviderAction;
  externalId: string;
  vehicle?: Vehicle;
  contentPresence?: { images: boolean; description: boolean; highlights: boolean };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  ignoreDeclaration: true,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  trimValues: true,
});

const MAX_XML_NODES = 20_000;

function normalizedKey(value: string): string {
  const withoutAttributePrefix = value.replace(/^@_/, "");
  return withoutAttributePrefix.split(":").at(-1)?.toLowerCase() ?? withoutAttributePrefix.toLowerCase();
}

function isRecord(value: unknown): value is XmlRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function visit(root: unknown, callback: (key: string, value: unknown, rawKey: string) => boolean | void): void {
  const queue: unknown[] = [root];
  let queueIndex = 0;
  let visited = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex++];
    if (++visited > MAX_XML_NODES) throw new Error("Hexon XML bevat te veel velden.");
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (!isRecord(current)) continue;
    for (const [key, value] of Object.entries(current)) {
      if (callback(normalizedKey(key), value, key) === true) return;
      if (Array.isArray(value) || isRecord(value)) queue.push(value);
    }
  }
}

function textFrom(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    return text || undefined;
  }
  let result: string | undefined;
  visit(value, (_key, nested, rawKey) => {
    if (rawKey.startsWith("@_")) return;
    if (typeof nested === "string" || typeof nested === "number" || typeof nested === "boolean") {
      const text = String(nested).trim();
      if (text) {
        result = text;
        return true;
      }
    }
  });
  return result;
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
  euro: "€",
  copy: "©",
  reg: "®",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  auml: "ä",
  euml: "ë",
  iuml: "ï",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Euml: "Ë",
  Iuml: "Ï",
  Ouml: "Ö",
  Uuml: "Ü",
  eacute: "é",
  Eacute: "É",
  egrave: "è",
  Egrave: "È",
  agrave: "à",
  Agrave: "À",
  ccedil: "ç",
  Ccedil: "Ç",
};

function decodeHtmlEntitiesOnce(value: string): string {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
    }
    return HTML_ENTITIES[entity] ?? HTML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function decodeHtmlEntities(value: string): string {
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeHtmlEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function sanitizeProviderDescription(value: string | undefined): string | undefined {
  if (!value) return undefined;

  let text = decodeHtmlEntities(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:p|div|ul|ol|li|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/\\@/g, "@");

  text = decodeHtmlEntities(text)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || undefined;
}

function attributeText(value: unknown, name: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const expected = normalizedKey(name);
  for (const [key, nested] of Object.entries(value)) {
    if (!key.startsWith("@_")) continue;
    if (normalizedKey(key) !== expected) continue;
    return textFrom(nested);
  }
  return undefined;
}

function firstField(root: unknown, names: string[]): unknown {
  for (const name of names) {
    const expected = normalizedKey(name);
    let found: unknown;
    visit(root, (key, value) => {
      if (key === expected) {
        found = value;
        return true;
      }
    });
    if (found !== undefined) return found;
  }
  return undefined;
}

function firstText(root: unknown, names: string[]): string | undefined {
  for (const name of names) {
    const text = textFrom(firstField(root, [name]));
    if (text) return text;
  }
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  const raw = textFrom(value)?.replace(/\s/g, "");
  if (!raw) return undefined;
  const normalized = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function parseInteger(value: unknown): number | undefined {
  const number = parseNumber(value);
  return number === undefined ? undefined : Math.round(number);
}

function firstNumber(root: unknown, names: string[]): number | undefined {
  for (const name of names) {
    const number = parseNumber(firstField(root, [name]));
    if (number !== undefined) return number;
  }
  return undefined;
}

function firstInteger(root: unknown, names: string[]): number | undefined {
  const number = firstNumber(root, names);
  return number === undefined ? undefined : Math.round(number);
}

/** VV uses Mobilox's own identification as a whole-kilometre practice range. */
function practiceRange(root: unknown): number | undefined {
  const value = firstText(root, ["eigen_identificatie", "custom_id", "voertuignr_klant"]);
  if (!value || !/^\d+$/.test(value)) return undefined;
  const range = Number(value);
  return Number.isSafeInteger(range) && range > 0 ? range : undefined;
}

function parseRoadTax(root: unknown): VehicleRoadTax | undefined {
  const modern = firstField(root, ["motorrijtuigen_belasting"]);
  const legacy = firstField(root, ["wegenbelasting_kwartaal"]);
  const node = modern ?? legacy;
  if (node === undefined) return undefined;

  // Both documented Hexon representations are quarterly euro ranges with
  // `min` and `max` values. Keep that source period intact in VVOS; the
  // showroom presentation performs the clearly labelled monthly conversion.
  const direct = parseNumber(node);
  const minimumEur = firstNumber(node, ["min"]) ?? direct;
  const maximumEur = firstNumber(node, ["max"]) ?? minimumEur;
  if (minimumEur === undefined || maximumEur === undefined || minimumEur < 0 || maximumEur < 0) return undefined;

  return {
    quarterlyMinCents: Math.round(Math.min(minimumEur, maximumEur) * 100),
    quarterlyMaxCents: Math.round(Math.max(minimumEur, maximumEur) * 100),
    source: "mobilox-hexon",
    sourceField: modern !== undefined ? "motorrijtuigen_belasting" : "wegenbelasting_kwartaal",
  };
}

function parseOdometerKm(value: unknown): number | undefined {
  const reading = parseNumber(value);
  if (reading === undefined) return undefined;
  const unit = attributeText(value, "eenheid")?.toUpperCase();
  if (!unit || unit === "K") return Math.round(reading);
  if (unit === "M") return Math.round(reading * 1.609344);
  throw new Error(`Niet-ondersteunde tellerstand-eenheid uit Hexon: ${unit}.`);
}

function parseBoolean(value: unknown): boolean {
  return ["1", "true", "ja", "yes", "j"].includes(textFrom(value)?.toLowerCase() ?? "");
}

function findPriceCents(root: unknown): number {
  for (const key of ["actieprijs", "verkoopprijs_particulier", "meeneemprijs"]) {
    const priceNode = firstField(root, [key]);
    const amount = parseNumber(firstField(priceNode, ["bedrag"]) ?? priceNode);
    if (amount !== undefined && amount > 0) return eurosToCents(amount, key);
  }
  throw new Error("Hexon verkoopprijs ontbreekt of is ongeldig.");
}

function inferDriveType(fuel: string, pluginHybrid: boolean): DriveType {
  const value = fuel.trim().toLowerCase();
  if (value === "e" || value === "electric" || value === "elektrisch") return "electric";
  if (pluginHybrid || value === "b,e" || value === "d,e") return "plug-in-hybrid";
  if (value === "h" || value.includes("hybrid") || value.includes("hybride")) return "full-hybrid";
  if (["b", "d", "l", "lpg", "cng"].includes(value)
    || /benzine|diesel|petrol|gasoline|aardgas/.test(value)) return "combustion";
  throw new Error(`Niet-ondersteunde aandrijving uit Hexon: ${fuel}.`);
}

function displayFuelType(fuel: string, driveType: DriveType): string {
  const value = fuel.trim().toUpperCase();
  if (driveType === "electric") return "Elektrisch";
  if (value === "B,E") return "Benzine / Elektrisch";
  if (value === "D,E") return "Diesel / Elektrisch";
  if (value === "H") return "Hybride";
  if (value === "B") return "Benzine";
  if (value === "D") return "Diesel";
  if (value === "L" || value === "LPG") return "LPG";
  if (value === "CNG") return "CNG";
  return fuel;
}

function displayTransmission(value: string | undefined): string {
  if (value === "A") return "Automaat";
  if (value === "H") return "Handgeschakeld";
  if (value === "S") return "Semi-automaat";
  if (value === "C") return "CVT";
  return value || "Onbekend";
}

function collectHttpsUrls(root: unknown): string[] {
  const urls = new Set<string>();
  visit(root, (key, value) => {
    if (key !== "url" || typeof value !== "string") return;
    const candidate = value.trim();
    if (candidate) urls.add(candidate);
  });
  return [...urls].slice(0, MAX_IMPORTED_PHOTOS);
}

function collectHighlights(root: unknown): string[] {
  const source = ["accessoires", "zoekaccessoires", "opties"].map(name => firstField(root, [name]));
  const values = new Set<string>();
  visit(source, (key, value) => {
    if (!["accessoire", "optie", "omschrijving", "naam"].includes(key)) return;
    for (const item of Array.isArray(value) ? value : [value]) {
      const text = textFrom(item);
      if (text) values.add(text);
    }
  });
  return [...values];
}

function safeExternalId(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  if (!normalized || normalized.length > 100) throw new Error("Hexon voertuignummer is ongeldig.");
  return normalized;
}

function providerMutationAction(root: unknown): ProviderAction {
  const vehicleNode = firstField(root, ["voertuig"]);
  const attribute = attributeText(vehicleNode, "actie")?.toLowerCase();
  const fallback = firstText(root, ["actie", "action"])?.toLowerCase();
  const value = attribute || fallback || "add";
  if (/delete|remove|verwijder|offline/.test(value)) return "delete";
  if (/change|update|wijzig/.test(value)) return "change";
  return "add";
}

export function parseHexonMutation(xml: string, now = new Date()): HexonMutation {
  if (!xml.trim() || xml.length > 2_000_000) throw new Error("Hexon XML ontbreekt of is te groot.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("DTD en entities zijn niet toegestaan.");
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error("Hexon XML is niet geldig.");

  const parsed = parser.parse(xml) as unknown;
  const vehicleNode = firstField(parsed, ["voertuig"]);
  if (!isRecord(vehicleNode)) throw new Error("Verwacht precies één volledig Mobilox-voertuig per aanlevering.");
  const externalId = safeExternalId(firstText(parsed, ["voertuignr_hexon", "voertuignr", "voertuignr_klant", "voertuignummer", "stocknummer"]) ?? "");
  const providerAction = providerMutationAction(parsed);
  const action = providerAction === "delete" ? "archive" : "upsert";
  if (action === "archive") return { action, providerAction, externalId };

  const brand = firstText(parsed, ["merk"]) ?? "";
  const model = firstText(parsed, ["model"]) ?? "";
  if (!brand || !model) throw new Error("Hexon merk of model ontbreekt.");
  const trim = firstText(parsed, ["uitrustingsniveau", "type", "titel"]) ?? "";
  const rawFuel = firstText(parsed, ["brandstof", "brandstof_omschrijving"]) ?? "";
  const pluginHybrid = parseBoolean(firstField(parsed, ["plugin_hybride"]));
  const driveType = inferDriveType(rawFuel, pluginHybrid);
  const fuelType = displayFuelType(rawFuel, driveType);
  const year = parseInteger(firstField(parsed, ["bouwjaar", "modeljaar"]));
  if (year === undefined || year < 1886 || year > now.getFullYear() + 2) throw new Error("Hexon bouwjaar ontbreekt of is ongeldig.");
  const mileageValue = firstField(parsed, ["tellerstand", "kilometerstand"]);
  const parsedMileageKm = parseOdometerKm(mileageValue);
  if (parsedMileageKm === undefined || parsedMileageKm < 0) throw new Error("Hexon kilometerstand ontbreekt of is ongeldig.");
  const mileageKm = parsedMileageKm;
  const images = collectHttpsUrls(firstField(parsed, ["afbeeldingen", "fotos", "foto_s"]));
  const sold = parseBoolean(firstField(parsed, ["verkocht"]));
  const reserved = parseBoolean(firstField(parsed, ["gereserveerd"]));
  const id = `hexon-${externalId}`;
  const updatedAt = now.toISOString();
  const vin = firstText(parsed, ["vin", "chassisnummer"]);
  const licensePlate = firstText(parsed, ["kenteken"]);
  // Mobilox sends the sales copy separately from its introduction text. Prefer
  // the explicit advert copy; legacy feeds retain their established fallbacks.
  // Preserve only fields actually present; their names do not prove Mobilox UI semantics.
  const sourceTexts: Record<string, string> = {};
  if (isRecord(vehicleNode)) {
    for (const name of ["opmerkingen", "omschrijving", "introductietekst", "advertentietekst"]) {
      const value = textFrom(Object.entries(vehicleNode).find(([key]) => normalizedKey(key) === name)?.[1]);
      if (value !== undefined) sourceTexts[name] = value;
    }
  }
  const description = sanitizeProviderDescription(sourceTexts.advertentietekst ?? sourceTexts.opmerkingen ?? sourceTexts.omschrijving);
  const batteryHealthPercent = firstInteger(parsed, ["accu_conditie"]);
  const wltpRangeKm = firstInteger(parsed, ["wltp_actieradius_elektrisch_combined"]);
  const realisticRangeKm = practiceRange(parsed);
  const electricRangeKm = wltpRangeKm ?? firstInteger(parsed, ["actieradius_elektrisch"]);
  const roadTax = parseRoadTax(parsed);
  const consumptionPer100Km = firstNumber(parsed, ["wltp_brandstofverbruik_combined_weighted", "wltp_brandstofverbruik_combined", "gemiddeld_verbruik"]);
  const warrantyMonths = firstInteger(parsed, ["garantie_maanden", "fabrieksgarantie_aantal_maanden"]);

  const specs: SourceSpecifications = {};
  for (const [key, definition] of Object.entries(numericSourceSpecs)) {
    const value = firstNumber(parsed, [...definition.fields]);
    if (value !== undefined && value >= 0) specs[key as keyof typeof numericSourceSpecs] = value;
  }
  for (const [key, definition] of Object.entries(textSourceSpecs)) {
    const value = firstText(parsed, [...definition.fields]);
    if (value !== undefined) specs[key as keyof typeof textSourceSpecs] = value;
  }
  const fastCharge = firstText(parsed, ["geschikt_voor_snelladen"])?.toLowerCase();
  if (fastCharge && ["j", "ja", "1", "true", "n", "nee", "0", "false"].includes(fastCharge)) {
    specs.fastChargingSupported = ["j", "ja", "1", "true"].includes(fastCharge);
  }
  const vehicle: Vehicle = {
    ...specs,
    id,
    slug: slugify(`${brand}-${model}-${trim}-${year}-${externalId}`),
    brand,
    model,
    trim,
    year,
    mileageKm,
    priceCents: findPriceCents(parsed),
    driveType,
    fuelType,
    transmission: displayTransmission(firstText(parsed, ["transmissie", "versnellingsbak"])),
    bodyStyle: firstText(parsed, ["carrosserie", "carrosserievorm"]) ?? "Onbekend",
    color: firstText(parsed, ["kleur_nederlands", "basiskleur"]) ?? "Onbekend",
    ...(batteryHealthPercent !== undefined ? { batteryHealthPercent } : {}),
    ...(electricRangeKm !== undefined ? { electricRangeKm } : {}),
    ...(wltpRangeKm !== undefined ? { wltpRangeKm } : {}),
    ...(realisticRangeKm !== undefined ? { realisticRangeKm } : {}),
    ...(roadTax ? { roadTax } : {}),
    ...(consumptionPer100Km !== undefined ? { consumptionPer100Km } : {}),
    ...(warrantyMonths !== undefined ? { warrantyMonths } : {}),
    maintenanceHistory: firstText(parsed, ["onderhoudsboekjes"]) === "dealer" ? "complete" : "unknown",
    ...(vin ? { vin } : {}),
    ...(licensePlate ? { licensePlate } : {}),
    images,
    highlights: collectHighlights(parsed),
    ...(description !== undefined ? { description } : {}),
    status: sold ? "sold" : reserved ? "reserved" : "review",
    locationCode: process.env.HEXON_DEFAULT_LOCATION_CODE || "GRONINGEN",
    updatedAt,
  };

  const validationErrors = validateVehicle(vehicle);
  if (parsedMileageKm === undefined && !validationErrors.includes("Kilometerstand ontbreekt")) {
    validationErrors.push("Kilometerstand ontbreekt");
  }
  if (!sold && !reserved && validationErrors.length === 0) vehicle.status = "available";
  vehicle.publication = {
    channels: {
      website: vehicle.status === "available",
      merchant: false,
      google_ads: false,
      meta: false,
    },
    completenessPercent: Math.max(0, 100 - validationErrors.length * 12),
    lastValidatedAt: updatedAt,
    validationErrors,
  };

  vehicle.editorial = { version: 1, revision: 0, photos: [], publishedOptionKeys: [], content: { sourceTexts } };
  const directKeys = new Set(Object.keys(vehicleNode).map(normalizedKey));
  const contentPresence = {
    images: ["afbeeldingen", "fotos", "foto_s"].some(key => directKeys.has(key)),
    description: ["advertentietekst", "opmerkingen", "omschrijving"].some(key => directKeys.has(key)),
    highlights: ["accessoires", "zoekaccessoires", "opties"].some(key => directKeys.has(key)),
  };
  return { action, providerAction, externalId, vehicle, contentPresence };
}
