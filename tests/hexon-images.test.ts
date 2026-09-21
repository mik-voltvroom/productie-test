import { describe, expect, it } from "vitest";
import { limitHexonImageUrls, MAX_IMAGES_PER_VEHICLE } from "@/lib/integrations/hexon-images";

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
});
