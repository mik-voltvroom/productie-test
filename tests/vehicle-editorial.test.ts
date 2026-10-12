import { describe, expect, it } from "vitest";
import { applyEditorialCommand, publicVehicleProjection } from "@/lib/vehicle/editorial";
import { parseHexonMutation } from "@/lib/integrations/hexon";
import { prepareHexonImages } from "@/lib/integrations/hexon-images";
import { buildMobiloxReplacement } from "@/lib/vehicle/mobilox";
import { planMobiloxRepair } from "@/lib/vehicle/mobilox-repair";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import { isPublishedOnWebsite } from "@/lib/vehicle/publication";
import { vehicleSpecifications } from "@/lib/vehicle/specifications";
import { emptyCosts } from "@/lib/business";

// Synthetic payload, solely for regression tests; not a real customer vehicle.
const now = "2026-10-06T10:00:00.000Z";
const photo = "https://media-eigenwebsiteincrementeel.export.dv.nl/test/photo.jpg";
const xml = `<voertuig actie="change"><voertuignr_hexon>test123</voertuignr_hexon><merk>Test</merk><model>Model</model><type>Uitvoering</type><bouwjaar>2022</bouwjaar><brandstof>E</brandstof><tellerstand>20000</tellerstand><verkoopprijs_particulier>25000</verkoopprijs_particulier><advertentietekst>Nieuwe bron</advertentietekst><afbeeldingen><afbeelding><url>${photo}</url></afbeelding></afbeeldingen><accessoires><accessoire>Nieuwe optie</accessoire></accessoires></voertuig>`;
const incoming = () => parseHexonMutation(xml, new Date(now)).vehicle!;
async function fresh() { return buildMobiloxReplacement(undefined, incoming(), (await prepareHexonImages([photo])).photos, now); }

describe("Mobilox authoritative public inventory", () => {
  it("keeps practice range from own identification out of public vehicle fields", () => {
    const vehicle = parseHexonMutation(xml.replace('</voertuig>', '<voertuignr_klant>320</voertuignr_klant></voertuig>')).vehicle!;
    expect(vehicle.realisticRangeKm).toBe(320);
    expect(publicVehicleProjection(vehicle)).not.toHaveProperty('realisticRangeKm');
  });
  it("replaces stale photos, text, options and absent specifications while preserving internal costs", async () => {
    const old = await fresh();
    old.images = ["https://storage.example.test/old.jpg"];
    old.description = "Oude tekst"; old.highlights = ["Oude optie"];
    old.editorial!.content.websiteText = "Handmatige override";
    old.editorial!.publishedOptionKeys = [];
    old.publication!.publicImageUrls = [];
    old.wltpRangeKm = 400; old.roadTax = { quarterlyMinCents: 100, quarterlyMaxCents: 100, source: "manual" };
    old.costs = { ...emptyCosts, purchasePriceCents: 1000000 };
    const next = buildMobiloxReplacement(old, incoming(), (await prepareHexonImages([photo])).photos, now);
    expect(next.images).toEqual([photo]);
    expect(next.description).toBe("Nieuwe bron");
    expect(next.highlights).toEqual(["Nieuwe optie"]);
    expect(next).not.toHaveProperty("wltpRangeKm");
    expect(next).not.toHaveProperty("roadTax");
    expect(next.publication).not.toHaveProperty("publicImageUrls");
    expect(next.editorial!.content).not.toHaveProperty("websiteText");
    expect(next.costs).toEqual(old.costs);
    expect(getPublicVehicleImages(next)).toEqual([photo]);
  });
  it("uses source order, removes old photos, and restores a photo deleted in VVOS", async () => {
    const old = await fresh();
    old.editorial!.photos[0].deletedAt = now;
    const urls = [photo.replace('photo.jpg', 'new.jpg'), photo];
    const prepared = await prepareHexonImages(urls, old.editorial!.photos);
    const next = buildMobiloxReplacement(old, incoming(), prepared.photos, now);
    expect(publicVehicleProjection(next).images).toEqual(urls);
    expect(next.editorial!.photos.some(item => item.deletedAt)).toBe(false);
  });
  it("keeps accepted deals reserved or sold after a source refresh", async () => {
    const old = await fresh();
    for (const status of ["reserved", "sold"] as const) {
      const current = { ...old, status, ...(status === 'sold' ? { soldDealId: 'deal1' } : { reservedDealId: 'deal1' }) };
      const next = buildMobiloxReplacement(current, incoming(), old.editorial!.photos, now);
      expect(next.status).toBe(status);
      expect(isPublishedOnWebsite(next)).toBe(false);
      expect(next.source!.inventoryStatus).toBe("available");
    }
  });
  it("keeps legacy private photos private until a verified replacement is available", async () => {
    const legacy = { ...await fresh(), source: { provider: "mobilox-hexon" }, images: [photo, "https://storage.example.test/private.jpg"] };
    legacy.editorial!.photos.push({ id: "private", url: "https://storage.example.test/private.jpg", source: "manual", importedAt: now });
    legacy.publication!.publicImageUrls = [photo];
    expect(publicVehicleProjection(legacy).images).toEqual([photo]);
  });
  it("rejects manual public-content commands", async () => {
    expect(() => applyEditorialCommand(incoming(), { type: "text", text: "override", revision: 0 }, now)).toThrow("Mobilox");
  });
  it("projects supported source specifications without leaking raw or financial data", async () => {
    const source = parseHexonMutation(xml.replace('</voertuig>', '<vermogen_motor_kw>150</vermogen_motor_kw><aantal_deuren>5</aantal_deuren><geschikt_voor_snelladen>n</geschikt_voor_snelladen><wltp_actieradius_elektrisch_combined>418</wltp_actieradius_elektrisch_combined><motorrijtuigen_belasting><kwartaal_min><prijs nr="1"><bedrag>198</bedrag><munteenheid>EUR</munteenheid></prijs></kwartaal_min><kwartaal_max><prijs nr="1"><bedrag>216</bedrag><munteenheid>EUR</munteenheid></prijs></kwartaal_max></motorrijtuigen_belasting></voertuig>')).vehicle!;
    const next = buildMobiloxReplacement(undefined, source, (await prepareHexonImages([photo])).photos, now);
    const projected = publicVehicleProjection(next);
    expect(projected).toMatchObject({ powerKw: 150, doors: 5, fastChargingSupported: false, wltpRangeKm: 418, roadTax: { quarterlyMinCents: 19800 } });
    expect(projected).not.toHaveProperty('commercial');
    expect(projected).not.toHaveProperty('editorial');
    expect(projected).not.toHaveProperty('raw');
    expect(vehicleSpecifications(projected).find(([label]) => label.includes('Snelladen'))?.[1]).toBe('Nee');
    expect(publicVehicleProjection(incoming())).not.toHaveProperty('powerKw');
  });
  it("dry-run makes no mutation, repairs idempotently and rejects a mismatched vehicle", async () => {
    const current = { ...await fresh(), description: "Old" };
    const before = JSON.stringify(current);
    const plan = await planMobiloxRepair(current, xml, now);
    expect(plan.changed).toBe(true);
    expect(JSON.stringify(current)).toBe(before);
    await expect(planMobiloxRepair(current, xml.replace(/<afbeeldingen>[\s\S]*?<\/afbeeldingen>/, ''), now)).rejects.toThrow('Onvolledige Mobilox');
    const repeat = await planMobiloxRepair(plan.replacement, xml, "2026-10-07T10:00:00.000Z");
    expect(repeat.changed).toBe(false);
    await expect(planMobiloxRepair(current, xml.replace('test123', 'other'), now)).rejects.toThrow('hetzelfde voertuig');
    await expect(planMobiloxRepair(current, xml.replace(photo, 'https://unapproved.test/a.jpg'), now)).rejects.toThrow('foto');
  });
  it("keeps the full source text and collects options from all existing source groups", () => {
    const source = parseHexonMutation(xml.replace('Nieuwe bron', 'Intro&lt;br&gt;Kenteken: TEST&lt;br&gt;Volledige tekst').replace('</voertuig>', '<opties><optie>Extra</optie></opties></voertuig>')).vehicle!;
    expect(source.description).toContain('Volledige tekst');
    expect(source.highlights).toEqual(['Nieuwe optie', 'Extra']);
  });
});

