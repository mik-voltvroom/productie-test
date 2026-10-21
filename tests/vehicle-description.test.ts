import { describe, expect, it } from "vitest";
import { descriptionBlocks, descriptionRoadTax, vehicleDescription } from "@/lib/vehicle/description";
import { vehicleSpecifications } from "@/lib/vehicle/specifications";
import { vehicles } from "@/lib/sample-data";

const authored = "Range Rover Velar | Facelift | Arroios Grey\nModern design, uitgebreid comfort en krachtige plug-inhybridetechniek. Deze auto combineert een verfijnde uitstraling met vierwielaandrijving.\nComfort tot in detail\nHet panoramadak en de lederen bekleding geven het interieur een lichte, luxe uitstraling. De voorstoelen beschikken over massage.\nBelangrijkste uitrusting- Panoramadak\n- 21-inch velgen\n\nFabrieksgarantie\nDe toepasselijkheid en resterende dekking voor deze auto moeten nog op chassisnummer worden bevestigd.\n\nVolt & Vroom\nEuvelgunnerweg 50";
const generated = "Range Rover Velar 2.0 P400e | Massage\n- Merk: Land Rover\n- Model: Range Rover Velar\n- Motorrijtuigenbelasting: € 441 - 482 per kwartaal\n\nPakket: Black Pack- Zwarte exterieur delen\n\nVeiligheid- Achteruitrijcamera\n- Vermoeidheidsherkenning";

describe("vehicle description presentation", () => {
  it("shows model years without a thousands separator while retaining mileage formatting", () => {
    const specs = vehicleSpecifications({ ...vehicles[0], year: 2023, mileageKm: 97240 });
    expect(specs).toContainEqual(["Bouwjaar", "2023"]);
    expect(specs).toContainEqual(["Kilometerstand", "97.240 km"]);
  });
  it("moves the complete authored text ahead of the generated prefix", () => {
    expect(vehicleDescription(`Korte introductie.\n\n${generated}\n\n${authored}`)).toEqual({ authored, generated });
  });
  it("preserves plain descriptions and uses the intro for generated-only imports", () => {
    expect(vehicleDescription(authored)).toEqual({ authored, generated: "" });
    expect(vehicleDescription(`Introductie.\n\n${generated}`)).toEqual({ authored: "Introductie.", generated });
    expect(vehicleDescription("<script>unsafe</script>")).toEqual({ authored: "<script>unsafe</script>", generated: "" });
  });
  it("formats headings and joined bullets without rewriting copy or warranty caveats", () => {
    const blocks = descriptionBlocks(authored);
    expect(blocks[0]).toEqual({ type: "heading", lines: ["Range Rover Velar | Facelift | Arroios Grey"] });
    expect(blocks).toContainEqual({ type: "heading", lines: ["Belangrijkste uitrusting"] });
    expect(blocks).toContainEqual({ type: "list", lines: ["Panoramadak", "21-inch velgen"] });
    expect(blocks.flatMap(block => block.lines).join("\n")).toContain("moeten nog op chassisnummer worden bevestigd.");
    expect(descriptionBlocks("Uitgebreide plug-inhybridetechniek met 21-inch velgen.")[0].lines[0]).toBe("Uitgebreide plug-inhybridetechniek met 21-inch velgen.");
  });
  it("shows only explicitly supplied quarterly road tax and prefers structured data", () => {
    expect(descriptionRoadTax(generated)).toBe("€ 441 - 482");
    expect(descriptionRoadTax("- Wegenbelasting: € 100 per maand")).toBeUndefined();
    expect(descriptionRoadTax("- Wegenbelasting: onbekend")).toBeUndefined();
    const vehicle = { ...vehicles[0], description: generated };
    expect(vehicleSpecifications(vehicle)).toContainEqual(["Wegenbelasting per kwartaal (aangeleverd)", "€ 441 - 482"]);
    expect(vehicleSpecifications({ ...vehicle, roadTax: { quarterlyMinCents: 45000, quarterlyMaxCents: 45000, source: "manual" } }))
      .toContainEqual(["Wegenbelasting per kwartaal (aangeleverd)", "€ 450,00"]);
  });
});
