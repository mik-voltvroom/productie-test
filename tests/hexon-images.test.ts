import { describe, expect, it } from "vitest";
import { limitHexonImageUrls, MAX_IMAGES_PER_VEHICLE, prepareHexonImages } from "@/lib/integrations/hexon-images";

describe("Mobilox/Hexon image import limit", () => {
  it("imports up to 200 vehicle photos", () => {
    const sourceUrls = Array.from(
      { length: 250 },
      (_, index) => `https://images.example.test/vehicle-${index + 1}.jpg`,
    );

    const limited = limitHexonImageUrls(sourceUrls);

    expect(MAX_IMAGES_PER_VEHICLE).toBe(200);
    expect(limited).toHaveLength(200);
    expect(limited.at(-1)).toBe("https://images.example.test/vehicle-200.jpg");
    expect(limited).not.toContain("https://images.example.test/vehicle-201.jpg");
  });

  it("keeps smaller photo sets unchanged", () => {
    const sourceUrls = [
      "https://images.example.test/vehicle-1.jpg",
      "https://images.example.test/vehicle-2.jpg",
    ];

    expect(limitHexonImageUrls(sourceUrls)).toEqual(sourceUrls);
  });

  it("uses validated Mobilox URLs directly without Firebase Storage", async () => {
    const sourceUrl = "https://media-eigenwebsiteincrementeel.export.dv.nl/103741/57134262-1.jpg";

    const result = await prepareHexonImages([sourceUrl]);

    expect(result.failures).toEqual([]);
    expect(result.images).toEqual([sourceUrl]);
    expect(result.photos).toMatchObject([{ url: sourceUrl, sourceUrl, source: "mobilox-hexon" }]);
  });

  it("rejects unapproved or unsafe image hosts without rejecting the vehicle", async () => {
    const result = await prepareHexonImages([
      "http://media-eigenwebsiteincrementeel.export.dv.nl/photo.jpg",
      "https://images.example.test/photo.jpg",
    ]);

    expect(result.images).toEqual([]);
    expect(result.photos).toEqual([]);
    expect(result.failures).toHaveLength(2);
  });

  it("restores the current Mobilox URL even after a legacy deletion or storage copy", async () => {
    const sourceUrl = "https://media-eigenwebsiteincrementeel.export.dv.nl/103741/photo.jpg";
    const imported = await prepareHexonImages([sourceUrl]);
    const deleted = [{ ...imported.photos[0], url: "https://storage.example.test/old.jpg", deletedAt: "2026-10-02T17:00:00.000Z" }];

    const refreshed = await prepareHexonImages([sourceUrl], deleted);

    expect(refreshed.images).toEqual([sourceUrl]);
    expect(refreshed.photos[0]).not.toHaveProperty("deletedAt");
  });
});
