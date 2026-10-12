import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { parseHexonRoadTax } from "@/lib/integrations/hexon-road-tax";
import { parseHexonMutation } from "@/lib/integrations/hexon";
import { buildMobiloxReplacement } from "@/lib/vehicle/mobilox";
import { publicVehicleProjection } from "@/lib/vehicle/editorial";
import { vehicleSpecifications } from "@/lib/vehicle/specifications";
import { monthlyRoadTaxLabel } from "@/lib/vehicle/showroom-card";
import { roadTaxSourceLabel } from "@/lib/vehicle/road-tax";

// Synthetic example shaped exactly like the v2.25 XSD, without request headers or credentials.
const endpoint = (name: string, amount: string, currency = "EUR") => `<${name}><prijs nr="1"><bedrag>${amount}</bedrag><munteenheid>${currency}</munteenheid><btw/><btw_percentage/><bpm/></prijs></${name}>`;
const taxXml = `<motorrijtuigen_belasting>${endpoint("maand_min", "66.01")}${endpoint("maand_max", "71.99")}${endpoint("kwartaal_min", "198")}${endpoint("kwartaal_max", "216")}${endpoint("jaar_min", "792")}${endpoint("jaar_max", "864")}</motorrijtuigen_belasting>`;
const parse = (tax = taxXml) => parseHexonRoadTax(new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(`<voertuig>${tax}</voertuig>`).voertuig);
const vehicleXml = `<voertuig actie="change"><voertuignr_hexon>tax-test</voertuignr_hexon><merk>Test</merk><model>Auto</model><bouwjaar>2024</bouwjaar><tellerstand>1000</tellerstand><brandstof>E</brandstof><verkoopprijs_particulier><bedrag>20000</bedrag></verkoopprijs_particulier>${taxXml}</voertuig>`;

describe("Mobilox period-specific road tax", () => {
  it("reads both quarterly endpoints, retaining supplied monthly amounts without recomputing them", () => {
    expect(parse()).toEqual({ quarterlyMinCents: 19800, quarterlyMaxCents: 21600, monthlyMinCents: 6601, monthlyMaxCents: 7199, source: "mobilox-hexon", sourceField: "motorrijtuigen_belasting", schemaVersion: 2 });
    expect(monthlyRoadTaxLabel(parse())).toBe("€ 66,01–71,99 p/m");
    expect(roadTaxSourceLabel(parse())).toContain("maandbedragen aangeleverd");
  });

  it("carries the source periods through replacement and public projection to both presentations", () => {
    const source = parseHexonMutation(vehicleXml).vehicle!;
    const next = buildMobiloxReplacement(undefined, source, [], "2026-10-12T08:00:00Z");
    const projected = publicVehicleProjection(next);
    expect(vehicleSpecifications(projected)).toContainEqual(["Wegenbelasting per kwartaal (aangeleverd)", "€ 198,00 – € 216,00"]);
    expect(monthlyRoadTaxLabel(next.roadTax)).toBe("€ 66,01–71,99 p/m");
  });

  it.each(["", "-1", "NaN", "Infinity", "90071992547409999", "216 euro"])("rejects invalid or missing quarterly maximum %s without substituting the minimum", amount => {
    expect(parse(taxXml.replace(endpoint("kwartaal_max", "216"), endpoint("kwartaal_max", amount)))).toBeUndefined();
  });

  it("does not mistake month, year, attributes or arbitrary metadata for a quarter", () => {
    expect(parse(`<motorrijtuigen_belasting>${endpoint("maand_min", "66")}${endpoint("jaar_min", "792")}</motorrijtuigen_belasting>`)).toBeUndefined();
    expect(parse('<motorrijtuigen_belasting nr="1"><metadata>198</metadata></motorrijtuigen_belasting>')).toBeUndefined();
    expect(parse('<motorrijtuigen_belasting><min>198</min><max>216</max></motorrijtuigen_belasting>')).toBeUndefined();
  });

  it("rejects inverted ranges and non-EUR or ambiguous EUR price collections", () => {
    expect(parse(taxXml.replace('<bedrag>216</bedrag>', '<bedrag>100</bedrag>'))).toBeUndefined();
    expect(parse(taxXml.replace(endpoint("kwartaal_max", "216"), endpoint("kwartaal_max", "216", "USD")))).toBeUndefined();
    expect(parse(taxXml.replace(endpoint("kwartaal_min", "198"), '<kwartaal_min><prijs><bedrag>198</bedrag><munteenheid>EUR</munteenheid></prijs><prijs><bedrag>199</bedrag><munteenheid>EUR</munteenheid></prijs></kwartaal_min>'))).toBeUndefined();
  });

  it("preserves explicit zero and decimal commas", () => {
    expect(parse(taxXml.replaceAll(/<bedrag>[^<]+<\/bedrag>/g, '<bedrag>0</bedrag>'))?.quarterlyMinCents).toBe(0);
    expect(monthlyRoadTaxLabel(parse(taxXml.replace('66.01', '66,01')))).toBe("€ 66,01–71,99 p/m");
  });

  it("falls back to labelled quarterly conversion only when no complete monthly pair exists", () => {
    const tax = parse(taxXml.replace(endpoint("maand_max", "71.99"), '<maand_max/>'));
    expect(tax).not.toHaveProperty("monthlyMinCents");
    expect(monthlyRoadTaxLabel(tax)).toBe("€ 66–72 p/m");
    expect(roadTaxSourceLabel(tax)).toContain("omgerekend");
  });

  it("retains the older explicitly quarterly format without recursive amount guessing", () => {
    expect(parse('<wegenbelasting_kwartaal><min>60</min><max>67</max></wegenbelasting_kwartaal>')?.quarterlyMaxCents).toBe(6700);
    expect(parse('<wegenbelasting_kwartaal><max>67</max></wegenbelasting_kwartaal>')).toBeUndefined();
    expect(parse('<wegenbelasting_kwartaal>0</wegenbelasting_kwartaal>')?.quarterlyMinCents).toBe(0);
  });

  it("hides incorrectly parsed old modern-field imports until a source refresh", () => {
    const vehicle = parseHexonMutation(vehicleXml).vehicle!;
    vehicle.roadTax = { quarterlyMinCents: 6601, quarterlyMaxCents: 6601, source: "mobilox-hexon", sourceField: "motorrijtuigen_belasting" };
    expect(monthlyRoadTaxLabel(vehicle.roadTax)).toBe("Niet opgegeven");
    expect(vehicleSpecifications(vehicle).some(([name]) => name.startsWith("Wegenbelasting"))).toBe(false);
    expect(roadTaxSourceLabel(vehicle.roadTax)).toContain("opnieuw ingelezen");
  });
});
