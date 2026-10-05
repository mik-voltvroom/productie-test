import { describe, expect, it } from "vitest";
import { applyEditorialCommand, editorialFor, mergeImportedEditorial, optionKey, publicOptions, publicVehicleProjection } from "@/lib/vehicle/editorial";
import { parseHexonMutation } from "@/lib/integrations/hexon";
import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import type { VehicleImage } from "@/types";

const now = "2026-09-22T10:00:00Z";
const xml = `<voertuig><voertuignr_hexon>123</voertuignr_hexon><merk>Volvo</merk><model>XC40</model><bouwjaar>2022</bouwjaar><brandstof>E</brandstof><tellerstand>20000</tellerstand><verkoopprijs_particulier>25000</verkoopprijs_particulier><opmerkingen>Intro uit feed</opmerkingen><omschrijving>Andere bron</omschrijving></voertuig>`;
const incoming = () => ({ ...parseHexonMutation(xml).vehicle!, highlights: Array.from({ length: 40 }, (_, i) => `Optie ${i + 1}`) });
const photos: VehicleImage[] = Array.from({ length: 20 }, (_, i) => ({ id: `p${i + 1}`, url: `https://example.com/${i + 1}.jpg`, source: "mobilox-hexon", contentHash: `hash${i + 1}`, importedAt: now }));

describe("VVOS publication control", () => {
  it("uses Mobilox advert copy instead of introduction text and keeps it current", () => {
    const withSeparateTexts = xml.replace(
      "<opmerkingen>Intro uit feed</opmerkingen><omschrijving>Andere bron</omschrijving>",
      "<introductietekst>Introductie voor intern gebruik</introductietekst><advertentietekst>Advertentietekst versie 1</advertentietekst><opmerkingen>Oude fallback</opmerkingen>",
    );
    const first = parseHexonMutation(withSeparateTexts).vehicle!;
    expect(first.description).toBe("Advertentietekst versie 1");
    expect(first.description).not.toContain("Introductie voor intern gebruik");

    let vehicle = mergeImportedEditorial(undefined, first, photos);
    vehicle = mergeImportedEditorial(vehicle, parseHexonMutation(withSeparateTexts.replace("versie 1", "versie 2")).vehicle!, photos);
    expect(vehicle.description).toBe("Advertentietekst versie 2");

    vehicle = applyEditorialCommand(vehicle, { type: "text", text: "Handmatige websitetekst", revision: 0 }, now);
    vehicle = mergeImportedEditorial(vehicle, parseHexonMutation(withSeparateTexts.replace("versie 1", "versie 3")).vehicle!, photos);
    expect(vehicle.description).toBe("Handmatige websitetekst");
  });

  it("does not leak raw legacy imports, internal photos or unselected options", () => {
    let vehicle = mergeImportedEditorial(undefined, incoming(), photos);
    vehicle = applyEditorialCommand(vehicle, { type: "visibility", id: "p2", online: false, revision: 0 }, now);
    vehicle = applyEditorialCommand(vehicle, { type: "options", keys: [optionKey("Optie 1")], revision: 1 }, now);
    const projected = publicVehicleProjection({ ...vehicle, raw: { opmerkingen: "internal" }, imageUrls: photos.map(photo => photo.url) } as typeof vehicle);
    expect(projected.images).not.toContain(photos[1].url);
    expect(projected.highlights).toEqual(["Optie 1"]);
    expect(projected).not.toHaveProperty("raw");
    expect(projected).not.toHaveProperty("imageUrls");
    expect(projected).not.toHaveProperty("editorial");
  });
  it("A-F: imports, reorders, retains absent photos and never resurrects deletions", () => {
    let vehicle = mergeImportedEditorial(undefined, incoming(), photos);
    expect(vehicle.images).toHaveLength(20);
    const ids = photos.map(photo => photo.id); ids.splice(14, 1); ids.unshift("p15");
    vehicle = applyEditorialCommand(vehicle, { type: "reorder", ids, revision: 0 }, now);
    expect(getPublicVehicleImages(vehicle)[0]).toBe(photos[14].url);
    vehicle = mergeImportedEditorial(vehicle, incoming(), photos.slice(0, 10));
    expect(vehicle.images).toHaveLength(20);
    expect(getPublicVehicleImages(vehicle)[0]).toBe(photos[14].url);
    vehicle = applyEditorialCommand(vehicle, { type: "delete", id: "p15", revision: 1 }, now);
    vehicle = mergeImportedEditorial(vehicle, incoming(), photos);
    expect(vehicle.images).toHaveLength(19);
    expect(getPublicVehicleImages(vehicle)).not.toContain(photos[14].url);
    expect(vehicle.editorial!.photos.find(photo => photo.id === "p15")?.deletedAt).toBe(now);
  });

  it("G-J: preserves 18 selected options, adds new options internally, deduplicates", () => {
    let vehicle = mergeImportedEditorial(undefined, incoming(), photos);
    expect(vehicle.highlights).toHaveLength(40);
    vehicle = applyEditorialCommand(vehicle, { type: "options", keys: vehicle.highlights.slice(0, 18).map(optionKey), revision: 0 }, now);
    const updated = { ...incoming(), highlights: [...incoming().highlights, "Nieuw", " OPTIE 1 "] };
    vehicle = mergeImportedEditorial(vehicle, updated, photos);
    vehicle = mergeImportedEditorial(vehicle, updated, photos);
    expect(vehicle.highlights).toHaveLength(41);
    expect(publicOptions(vehicle)).toHaveLength(18);
    expect(publicOptions(vehicle)).not.toContain("Nieuw");
    expect(vehicle.images).toHaveLength(20);
  });

  it("preserves an explicitly empty option selection across later imports", () => {
    let vehicle = mergeImportedEditorial(undefined, incoming(), photos);
    vehicle = applyEditorialCommand(vehicle, { type: "options", keys: [], revision: 0 }, now);
    vehicle = mergeImportedEditorial(vehicle, incoming(), photos);
    expect(publicOptions(vehicle)).toEqual([]);
    expect(vehicle.editorial?.publishedOptionKeys).toEqual([]);
  });

  it("K: keeps source fields separate and preserves manually edited website text", () => {
    let vehicle = mergeImportedEditorial(undefined, incoming(), photos);
    expect(vehicle.editorial!.content.sourceTexts).toEqual({ opmerkingen: "Intro uit feed", omschrijving: "Andere bron" });
    vehicle = applyEditorialCommand(vehicle, { type: "text", text: "Eigen advertentie", revision: 0 }, now);
    vehicle = mergeImportedEditorial(vehicle, parseHexonMutation(xml.replace("Intro uit feed", "Nieuwe bron")).vehicle!, photos);
    expect(vehicle.description).toBe("Eigen advertentie");
    expect(vehicle.editorial!.content.sourceTexts.opmerkingen).toBe("Nieuwe bron");
    expect(vehicle.editorial!.content.sourceTexts.omschrijving).toBe("Andere bron");
  });

  it("keeps manual showroom values until Mobilox supplies the same fields", () => {
    const manualRoadTax = {
      quarterlyMinCents: 18_000,
      quarterlyMaxCents: 18_000,
      source: "manual" as const,
    };
    const current = {
      ...incoming(),
      wltpRangeKm: 410,
      realisticRangeKm: 350,
      roadTax: manualRoadTax,
    };
    const withoutShowroomValues = incoming();
    const retained = mergeImportedEditorial(current, withoutShowroomValues, photos);
    expect(retained).toMatchObject({
      wltpRangeKm: 410,
      realisticRangeKm: 350,
      roadTax: manualRoadTax,
    });

    const mobiloxRoadTax = {
      quarterlyMinCents: 19_800,
      quarterlyMaxCents: 21_600,
      source: "mobilox-hexon" as const,
      sourceField: "motorrijtuigen_belasting" as const,
    };
    const overwritten = mergeImportedEditorial(retained, {
      ...withoutShowroomValues,
      wltpRangeKm: 418,
      realisticRangeKm: 365,
      roadTax: mobiloxRoadTax,
    }, photos);
    expect(overwritten).toMatchObject({
      wltpRangeKm: 418,
      realisticRangeKm: 365,
      roadTax: mobiloxRoadTax,
    });
  });

  it("rejects stale manual changes and invalid reorder lists", () => {
    const vehicle = mergeImportedEditorial(undefined, incoming(), photos);
    expect(() => applyEditorialCommand(vehicle, { type: "reorder", ids: ["p1"], revision: 0 }, now)).toThrow();
    expect(() => applyEditorialCommand(vehicle, { type: "options", keys: [], revision: 1 }, now)).toThrow();
  });

  it("retains legacy data through lazy migration and deduplicates changed URLs by content", () => {
    const legacy = { ...incoming(), editorial: undefined, images: [photos[0].url], description: "Bestaande tekst" };
    expect(editorialFor(legacy).content.websiteText).toBe("Bestaande tekst");
    let vehicle = mergeImportedEditorial(legacy, incoming(), photos);
    vehicle = applyEditorialCommand(vehicle, { type: "delete", id: photos[0].url, revision: 0 }, now);
    vehicle = mergeImportedEditorial(vehicle, incoming(), [{ ...photos[0], url: "https://changed.test/photo.jpg", id: "new-id" }]);
    expect(vehicle.images).toHaveLength(19);
  });

  it("parses 200 photos end-to-end and more than 40 options", () => {
    const payload = xml.replace("</voertuig>", `<afbeeldingen>${Array.from({ length: 210 }, (_, i) => `<afbeelding><url>https://example.com/${i}.jpg</url></afbeelding>`).join("")}</afbeeldingen><accessoires>${Array.from({ length: 60 }, (_, i) => `<accessoire>Optie ${i}</accessoire>`).join("")}</accessoires></voertuig>`);
    const vehicle = parseHexonMutation(payload).vehicle!;
    expect(vehicle.images).toHaveLength(200);
    expect(vehicle.highlights).toHaveLength(60);
  });
});
