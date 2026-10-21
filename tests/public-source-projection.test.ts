import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-admin", () => ({ adminDb: null }));
vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
import { projectPublicVehicle } from "@/lib/public-vehicles";
import { publicVehicleProjection } from "@/lib/vehicle/editorial";
import { parseHexonMutation } from "@/lib/integrations/hexon";
import { prepareHexonImages } from "@/lib/integrations/hexon-images";
import { buildMobiloxReplacement } from "@/lib/vehicle/mobilox";

// Synthetic XML only; these values are not facts about any production vehicle.
const url = "https://media-eigenwebsiteincrementeel.export.dv.nl/test/source.jpg";
const xml = `<voertuig actie="change"><voertuignr_hexon>projection-test</voertuignr_hexon><merk>Test</merk><model>Model</model><type>Testuitvoering</type><bouwjaar>2023</bouwjaar><brandstof>E</brandstof><tellerstand>1000</tellerstand><verkoopprijs_particulier>25000</verkoopprijs_particulier><advertentietekst>Brontekst</advertentietekst><afbeeldingen><afbeelding><url>${url}</url></afbeelding></afbeeldingen><accessoires><accessoire>Bronoptie</accessoire></accessoires><accu_laadvermogen>11</accu_laadvermogen><geschikt_voor_snelladen>n</geschikt_voor_snelladen><stekkeraansluiting>Testconnector</stekkeraansluiting><vermogen_elektrisch_kw>100</vermogen_elektrisch_kw></voertuig>`;
async function vehicle() {
  const source = parseHexonMutation(xml).vehicle!;
  return buildMobiloxReplacement(undefined, source, (await prepareHexonImages(source.images)).photos, "2026-10-07T00:00:00Z");
}
const project = (value: unknown) => projectPublicVehicle(value as Parameters<typeof projectPublicVehicle>[0]);

describe("public Mobilox projection boundaries", () => {
  it("keeps both public adapters on the same source content and ignores legacy overrides", async () => {
    const source = await vehicle();
    source.editorial!.content.websiteText = "Manual text";
    source.editorial!.publishedOptionKeys = [];
    source.editorial!.photos = [];
    source.publication!.publicImageUrls = [];
    const canonical = publicVehicleProjection(source);
    const compat = project({ ...source, raw: { opmerkingen: "Old text" }, hybrid: { chargingPowerKw: 99, fastChargingSupported: true }, accessories: ["Manual option"] });
    expect(compat.imageUrls).toEqual(canonical.images);
    expect(compat.description).toBe(canonical.description);
    expect(compat.accessories).toEqual(canonical.highlights);
    expect(compat).toMatchObject({ available: true, chargingPowerKw: 11, fastChargingSupported: false, electricPowerKw: 100, connector: "Testconnector" });
    expect(compat).not.toHaveProperty("costs");
    expect(compat).not.toHaveProperty("editorial");
  });
  it("does not resurrect omitted specifications or cleared text/options from legacy data", async () => {
    const source = await vehicle();
    delete source.chargingPowerKw;
    delete source.fastChargingSupported;
    delete source.description;
    source.highlights = [];
    const result = project({ ...source, hybrid: { chargingPowerKw: 99 }, raw: { accu_laadvermogen: 99, opmerkingen: "Old" }, accessories: ["Old"] });
    expect(result.chargingPowerKw).toBeUndefined();
    expect(result.fastChargingSupported).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.accessories).toEqual([]);
  });
  it("does not advertise reserved, archived, invalid or photo-less source records", async () => {
    const source = await vehicle();
    for (const status of ["reserved", "sold", "archived", "review"] as const) {
      expect(project({ ...source, status }).available).toBe(false);
      expect(project({ ...source, source: { ...source.source, inventoryStatus: status } }).available).toBe(false);
    }
    expect(project({ ...source, images: [] }).available).toBe(false);
    expect(project({ ...source, publication: { ...source.publication, validationErrors: ["Incomplete"] } }).available).toBe(false);
  });
});
