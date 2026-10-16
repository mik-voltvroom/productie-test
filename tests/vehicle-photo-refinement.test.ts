// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { InventoryBrowser } from "@/components/InventoryBrowser";
import { vehicles } from "@/lib/sample-data";

describe("vehicle photo presentation", () => {
  it.each(["electric", "full-hybrid", "plug-in-hybrid", "combustion"] as const)("renders the vehicle photo without a category overlay for %s", driveType => {
    const html = renderToStaticMarkup(createElement(InventoryBrowser, {
      vehicles: [{ ...vehicles[0], driveType }], showFilters: false,
    }));
    const document = new DOMParser().parseFromString(html, "text/html");
    const overlay = document.querySelector('#aanbod-resultaten span[role="img"]')!;
    expect(overlay).toBeNull();
    const photo = document.querySelector('#aanbod-resultaten a > div > img')!;
    expect(photo.getAttribute("width")).toBe("1920");
    expect(photo.getAttribute("height")).toBe("1280");
    expect(photo.getAttribute("loading")).toBe("lazy");
  });

  it("preserves the uncropped gallery and uses covering 4:3 card frames", () => {
    const gallery = readFileSync("components/vehicles/VehicleGallery.tsx", "utf8");
    const page = readFileSync("app/voorraad/[slug]/page.tsx", "utf8");
    const cards = readFileSync("app/voorraad/voorraad.module.css", "utf8");
    expect(gallery).not.toContain('className="badge"');
    expect(page).toContain('isReserved ? "Gereserveerd" : "Beschikbaar bij Volt & Vroom in Groningen"');
    expect(gallery).toContain("aspect-ratio:3/2");
    expect(gallery).not.toContain("object-fit:cover");
    expect(gallery).toContain('aria-pressed={current === i}');
    expect(cards).toContain(".media{position:relative;width:100%;aspect-ratio:4/3;");
    expect(cards).toContain(".media>img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}");
  });

  it("uses an opt-in dark CTA with accessible normal and hover contrast", () => {
    const css = readFileSync("components/vehicles/vehicle-cta.module.css", "utf8");
    const luminance = (rgb: number[]) => rgb.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    for (const foreground of [[22,139,255], [230,242,255]]) {
      expect((luminance(foreground) + .05) / (luminance([13,17,23]) + .05)).toBeGreaterThanOrEqual(4.5);
    }
    expect(css).toContain("var(--vv-electric)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(":disabled");
    expect(css).toContain(":active");
  });
});
