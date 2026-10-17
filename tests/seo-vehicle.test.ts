import { afterEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { vehicleMetadata } from "@/lib/seo/metadata";
import { serializeJsonLd, vehicleSchema, vehicleSeo } from "@/lib/seo/business";
import type { Vehicle } from "@/types";
const car = (extra: Partial<Vehicle> = {}): Vehicle => ({ id: "synthetic", slug: 'a/b-é&"', brand: "Test", model: "Model", trim: "Edition", year: 2022, mileageKm: 0, priceCents: 1234567, status: "available", images: ["https://example.test/public.jpg"], ...extra } as Vehicle);
afterEach(() => vi.unstubAllEnvs());
describe("public vehicle SEO", () => {
  it("keeps price, zero mileage, URL, image and currency coherent", () => {
    const vehicle = car(), seo = vehicleSeo(vehicle), schema = vehicleSchema(vehicle, "Zichtbare bronbeschrijving"), metadata = vehicleMetadata(vehicle);
    expect(schema['@type']).toEqual(["Car", "Product"]);
    expect(schema.offers?.price).toBe("12345.67");
    expect(schema.offers?.priceCurrency).toBe("EUR");
    expect(schema.mileageFromOdometer?.value).toBe(0);
    expect(schema).not.toHaveProperty("itemCondition");
    expect(metadata.alternates?.canonical).toBe(seo.url);
    expect(schema.url).toBe(seo.url); expect(schema.image).toEqual(seo.images);
    expect(schema.description).toBe("Zichtbare bronbeschrijving");
    expect(seo.url).toContain('a%2Fb-%C3%A9%26%22');
    expect(seo.description).toContain("0 km");
  });
  it.each([undefined, 0, -10, NaN, Infinity, 1.5])("omits invalid Offer at %s cents", priceCents => {
    const schema = vehicleSchema(car({ priceCents }), "Bron");
    expect(schema.offers).toBeUndefined(); expect(vehicleSeo(car({ priceCents })).description).toContain("Prijs op aanvraag");
  });
  it.each(["reserved", "sold", "archived", "draft"] as const)("never offers a non-available car: %s", status => {
    expect(vehicleSchema(car({ status }), "Bron").offers).toBeUndefined();
  });
  it("uses a stable identity across slug changes and never guesses condition from mileage", () => {
    expect(vehicleSchema(car(), "Bron")['@id']).toBe(vehicleSchema(car({ slug: "new" }), "Bron")['@id']);
    expect(vehicleSchema(car({ mileageKm: 12 }), "Bron")).not.toHaveProperty("itemCondition");
  });
  it("bounds extreme trim text, removes HTML in metadata, and preserves special text", () => {
    const seo = vehicleSeo(car({ model: "Test Model", trim: '<b>Édition & "Plus"</b> ' + "lang ".repeat(500) + '<script>alert(1)</script>' }));
    expect(seo.title).not.toContain("Test Test"); expect(seo.title.length).toBeLessThan(180);
    expect(seo.title).toContain('Édition & "Plus"'); expect(seo.title).not.toMatch(/<|alert\(1\)/);
    expect(seo.issues.length).toBeGreaterThan(0);
  });
  it("does not leak other public projection fields or internal data", () => {
    const schema = vehicleSchema({ ...car(), vin: "private-vin", licensePlate: "private-plate", costs: { purchasePriceCents: 7 }, source: { raw: "payload" } } as unknown as Vehicle, "Bron");
    expect(JSON.stringify(schema)).not.toMatch(/private-vin|private-plate|purchasePrice|payload/);
  });
  it("does not inherit homepage social images when no allowed vehicle image exists", () => {
    const metadata = vehicleMetadata(car({ images: ["javascript:alert(1)", "http://example.test/a"] }));
    expect(metadata.openGraph?.images).toEqual([]); expect(metadata.twitter?.images).toEqual([]);
  });
  it("escapes script-like source descriptions without modifying their displayed text value", () => {
    const schema = vehicleSchema(car(), '</script><b>Letterlijke bron</b>');
    expect(serializeJsonLd(schema)).not.toContain('</script>');
    expect(JSON.parse(serializeJsonLd(schema)).description).toBe(schema.description);
  });
});

describe("existing diagnostic parser compatibility", () => {
  it("recognizes legacy type, arrays, graphs and duplicate entities in both consumers", async () => {
    // The diagnostic itself is plain Node ESM; execute the real module rather than a copy.
    const vectors = [{ '@type': 'Car' }, [{ '@type': ['Car', 'Product'] }], { '@graph': [{ '@type': 'Service' }, { '@type': ['Product', 'Car'] }] }, [{ '@type': 'Car' }, { '@type': 'Car' }], { '@type': 'Product', offers: { '@type': 'Car' } }];
    const expected = [1, 1, 1, 2, 0];
    const nodeCode = "import { carEntities } from './scripts/seo-schema.mjs'; console.log(JSON.stringify(JSON.parse(process.argv[1]).map(v=>carEntities(v).length)));";
    expect(JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', nodeCode, JSON.stringify(vectors)], { encoding: 'utf8' }))).toEqual(expected);
    const python = process.env.SEO_TEST_PYTHON || 'python3';
    expect(JSON.parse(execFileSync(python, ['-B', '-c', 'import json,sys; from scripts.seo_schema import car_entities; print(json.dumps([len(car_entities(v)) for v in json.loads(sys.argv[1])]))', JSON.stringify(vectors)], { encoding: 'utf8' }))).toEqual(expected);
  });
});
