import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export type MobiloxMutationAction = "add" | "change" | "delete";
export type MobiloxRawPayload = Record<string, string | string[]>;

export interface MobiloxVehicleMutation {
  provider: "mobilox";
  sourceSystem: "hexon-incremental-xml";
  action: MobiloxMutationAction;
  providerVehicleId: string;
  customerNumber?: string;
  stockNumber?: string;
  externalStockNumber?: string;
  licensePlate?: string;
  vin?: string;
  brand?: string;
  model?: string;
  type?: string;
  body?: string;
  mileage?: number;
  mileageUnit?: "K" | "M";
  fuel?: string;
  transmission?: string;
  year?: number;
  firstRegistrationDate?: string;
  color?: string;
  baseColor?: string;
  vatMargin?: string;
  newVehicle?: boolean;
  expected?: boolean;
  reserved?: boolean;
  sold?: boolean;
  soldDate?: string;
  retailPrice?: number;
  actionPrice?: number;
  tradePrice?: number;
  exportPrice?: number;
  takeAwayPrice?: number;
  currency?: string;
  title?: string;
  highlights?: string;
  description?: string;
  accessories: string[];
  imageUrls: string[];
  hybrid?: {
    hybridType?: string;
    drivetrain?: string;
    pluginHybrid?: boolean;
    batteryOwnership?: string;
    batteryType?: string;
    batteryConditionPct?: number;
    batteryCapacityAh?: number;
    batteryVoltageV?: number;
    batteryYear?: number;
    chargingPowerKw?: number;
    chargingTimeMinutes?: number;
    fastChargingTimeMinutes?: number;
    chargingSpeedKmPerHour?: number;
    fastChargingSpeedKmPerHour?: number;
    chargingPhases?: number;
    connector?: string;
    fastChargeConnector?: string;
    fastChargingSupported?: boolean;
    electricRangeKm?: number;
    electricPowerKw?: number;
    electricPowerHp?: number;
  };
  raw: MobiloxRawPayload;
  receivedAt: string;
}

const actionSchema = z.enum(["add", "change", "delete"]);
const leafElementPattern = /<([A-Za-z_][\w.-]*)\b[^>]*>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*?))\s*<\/\1>/g;
const imageElementPattern = /<(?:afbeelding|foto|url)\b[^>]*>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*?))\s*<\/(?:afbeelding|foto|url)>/gi;

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function pushValue(result: MobiloxRawPayload, key: string, value: string) {
  if (!value) return;
  const existing = result[key];
  if (existing === undefined) result[key] = value;
  else if (Array.isArray(existing)) existing.push(value);
  else result[key] = [existing, value];
}

/**
 * Parse the supplied Hexon incremental XML as a flat field map. We match leaf
 * elements anywhere in the document, so both a flat payload and a normal XML
 * root wrapper work. DTD/entities are rejected before parsing.
 */
export function parseMobiloxIncrementalXml(xml: string): MobiloxRawPayload {
  const trimmed = xml.trim();
  if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) throw new Error("Geen geldige XML ontvangen.");
  if (/<!DOCTYPE|<!ENTITY/i.test(trimmed)) throw new Error("XML met DTD/entities wordt niet geaccepteerd.");

  const result: MobiloxRawPayload = {};
  for (const match of trimmed.matchAll(leafElementPattern)) {
    const key = match[1];
    const value = decodeXml((match[2] ?? match[3] ?? "").trim());
    pushValue(result, key, value);
  }

  const images = [...trimmed.matchAll(imageElementPattern)]
    .map(match => decodeXml((match[1] ?? match[2] ?? "").trim()))
    .filter(value => /^https?:\/\//i.test(value));
  if (images.length) result.afbeeldingen = [...new Set(images)];

  if (typeof result.afbeeldingen === "string") {
    result.afbeeldingen = result.afbeeldingen.split(",").map(url => url.trim()).filter(Boolean);
  }
  if (Object.keys(result).length === 0) throw new Error("XML bevat geen ondersteunde velden.");
  return result;
}

function text(raw: MobiloxRawPayload, key: string): string | undefined {
  const value = raw[key];
  if (Array.isArray(value)) return value.find(Boolean);
  return value?.length ? value : undefined;
}

function list(raw: MobiloxRawPayload, key: string): string[] {
  const value = raw[key];
  if (Array.isArray(value)) return value.flatMap(item => item.split(",")).map(item => item.trim()).filter(Boolean);
  return typeof value === "string" && value.length ? value.split(",").map(item => item.trim()).filter(Boolean) : [];
}

function numberValue(raw: MobiloxRawPayload, key: string): number | undefined {
  const value = text(raw, key);
  if (!value) return undefined;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanValue(raw: MobiloxRawPayload, key: string): boolean | undefined {
  const value = text(raw, key)?.toLowerCase();
  if (["j", "ja", "1", "true"].includes(value ?? "")) return true;
  if (["n", "nee", "0", "false"].includes(value ?? "")) return false;
  return undefined;
}

export function normalizeMobiloxMutation(xml: string): MobiloxVehicleMutation {
  const raw = parseMobiloxIncrementalXml(xml);
  const action = actionSchema.parse(text(raw, "actie"));
  const providerVehicleId = text(raw, "voertuignr_hexon");
  if (!providerVehicleId) throw new Error("voertuignr_hexon ontbreekt.");

  const mutation: MobiloxVehicleMutation = {
    provider: "mobilox",
    sourceSystem: "hexon-incremental-xml",
    action,
    providerVehicleId,
    customerNumber: text(raw, "klantnummer"),
    stockNumber: text(raw, "voertuignr"),
    externalStockNumber: text(raw, "voertuignr_klant"),
    licensePlate: text(raw, "kenteken"),
    vin: text(raw, "vin"),
    brand: text(raw, "merk"),
    model: text(raw, "model"),
    type: text(raw, "type"),
    body: text(raw, "carrosserie"),
    mileage: numberValue(raw, "tellerstand"),
    mileageUnit: text(raw, "tellerstand_eenheid") as "K" | "M" | undefined,
    fuel: text(raw, "brandstof"),
    transmission: text(raw, "transmissie"),
    year: numberValue(raw, "bouwjaar"),
    firstRegistrationDate: text(raw, "datum_deel_1"),
    color: text(raw, "kleur"),
    baseColor: text(raw, "basiskleur"),
    vatMargin: text(raw, "btw_marge"),
    newVehicle: booleanValue(raw, "nieuw"),
    expected: booleanValue(raw, "verwacht"),
    reserved: booleanValue(raw, "gereserveerd"),
    sold: booleanValue(raw, "verkocht"),
    soldDate: text(raw, "verkocht_datum"),
    retailPrice: numberValue(raw, "verkoopprijs_particulier_bedrag"),
    actionPrice: numberValue(raw, "actieprijs_particulier"),
    tradePrice: numberValue(raw, "verkoopprijs_handel"),
    exportPrice: numberValue(raw, "exportprijs"),
    takeAwayPrice: numberValue(raw, "meeneemprijs"),
    currency: text(raw, "munteenheid") ?? text(raw, "verkoopprijs_particulier_munteenheid"),
    title: text(raw, "titel"),
    highlights: text(raw, "highlights"),
    description: text(raw, "opmerkingen"),
    accessories: list(raw, "accessoires"),
    imageUrls: list(raw, "afbeeldingen"),
    raw,
    receivedAt: new Date().toISOString(),
  };

  const hybrid = {
    hybridType: text(raw, "type_hybride"),
    drivetrain: text(raw, "hybride_aandrijving"),
    pluginHybrid: booleanValue(raw, "plugin_hybride"),
    batteryOwnership: text(raw, "aanwezige_accu"),
    batteryType: text(raw, "accutype"),
    batteryConditionPct: numberValue(raw, "accu_conditie"),
    batteryCapacityAh: numberValue(raw, "accucapaciteit"),
    batteryVoltageV: numberValue(raw, "accuspanning"),
    batteryYear: numberValue(raw, "accubouwjaar"),
    chargingPowerKw: numberValue(raw, "accu_laadvermogen"),
    chargingTimeMinutes: numberValue(raw, "accu_laadtijd"),
    fastChargingTimeMinutes: numberValue(raw, "accu_snellaadtijd"),
    chargingSpeedKmPerHour: numberValue(raw, "accu_laadsnelheid"),
    fastChargingSpeedKmPerHour: numberValue(raw, "accu_snellaadsnelheid"),
    chargingPhases: numberValue(raw, "aantal_fasen_acculader"),
    connector: text(raw, "stekkeraansluiting"),
    fastChargeConnector: text(raw, "stekkeraansluiting_snellader"),
    fastChargingSupported: booleanValue(raw, "geschikt_voor_snelladen"),
    electricRangeKm: numberValue(raw, "actieradius_elektrisch"),
    electricPowerKw: numberValue(raw, "vermogen_elektrisch_kw"),
    electricPowerHp: numberValue(raw, "vermogen_elektrisch_pk"),
  };

  if (Object.values(hybrid).some(value => value !== undefined)) mutation.hybrid = hybrid;
  return mutation;
}

export function verifyMobiloxBasicAuth(authorizationHeader: string | null): boolean {
  const expectedUser = process.env.MOBILOX_BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.MOBILOX_BASIC_AUTH_PASSWORD;
  if (!expectedUser || !expectedPassword || !authorizationHeader?.startsWith("Basic ")) return false;
  let decoded = "";
  try { decoded = Buffer.from(authorizationHeader.slice(6), "base64").toString("utf8"); } catch { return false; }
  const expected = Buffer.from(`${expectedUser}:${expectedPassword}`);
  const actual = Buffer.from(decoded);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function mobiloxSuccessResponse(): string { return "1"; }
