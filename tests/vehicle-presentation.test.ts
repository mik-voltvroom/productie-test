import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { vehiclePresentation } from "@/lib/vehicle/presentation";
import { VehicleHighlights } from "@/components/vehicles/VehicleHighlights";

const source = "Recharge R-Design 70kWh|Org NL NAP|1 Eig|LED|CarPlay|DAB|Leder/Alcantara|Camera|All-Season|Thunder Grey|Isofix|Dealer Onderhouden";

describe("Mobilox execution and highlights presentation", () => {
  it("splits only pipes, preserves source order and does not rewrite vehicle claims", () => {
    expect(vehiclePresentation(source)).toEqual({
      edition: "Recharge R-Design 70kWh",
      highlights: ["Org NL NAP", "1 Eig", "LED", "CarPlay", "DAB", "Leder/Alcantara", "Camera", "All-Season", "Thunder Grey", "Isofix", "Dealer Onderhouden"],
    });
    expect(source).toContain("70kWh|Org NL NAP");
  });

  it("handles empty data, legacy plain executions and repeated/empty segments", () => {
    expect(vehiclePresentation(undefined)).toEqual({ edition: "", highlights: [] });
    expect(vehiclePresentation(null)).toEqual({ edition: "", highlights: [] });
    expect(vehiclePresentation("  PureTech 130 EAT8  ")).toEqual({ edition: "PureTech 130 EAT8", highlights: [] });
    expect(vehiclePresentation(" || R-Design | LED | led || R-Design | Dealer   Onderhouden ")).toEqual({ edition: "R-Design", highlights: ["LED", "Dealer Onderhouden"] });
  });

  it("renders all highlights on the detail page as an accessible list", () => {
    const html = renderToStaticMarkup(createElement(VehicleHighlights, { trim: source }));
    expect(html).toContain("Recharge R-Design 70kWh</p>");
    expect(html).toContain('aria-label="Highlights van deze auto"');
    expect((html.match(/<li /g) ?? []).length).toBe(11);
    expect(html).toContain("Dealer Onderhouden</li>");
    expect(html).not.toContain("|");
    expect(html).not.toContain("+8 highlights");
  });

  it("keeps cards compact while disclosing the number and names of remaining highlights", () => {
    const html = renderToStaticMarkup(createElement(VehicleHighlights, { trim: source, compact: true }));
    expect((html.match(/<li /g) ?? []).length).toBe(4);
    expect(html).toContain("LED</li>");
    expect(html).toContain("+8 highlights");
    expect(html).toContain('aria-label="8 aanvullende highlights: CarPlay, DAB, Leder/Alcantara, Camera, All-Season, Thunder Grey, Isofix, Dealer Onderhouden"');
  });

  it("escapes external text rather than interpreting it as markup", () => {
    const html = renderToStaticMarkup(createElement(VehicleHighlights, { trim: 'Edition|<script>alert("x")</script>' }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(renderToStaticMarkup(createElement(VehicleHighlights, { trim: "" }))).toBe("");
  });

  it("shares presentation across the public detail page and all inventory cards", () => {
    for (const path of ["app/page.tsx", "app/voorraad/[slug]/page.tsx", "components/InventoryBrowser.tsx", "components/VehicleCard.tsx", "components/FeaturedInventoryRail.tsx"]) {
      const code = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(code).toMatch(/<VehicleHighlights trim=\{(?:latestVehicle|vehicle)\.trim\}/);
    }
    const inventory = readFileSync(resolve(process.cwd(), "components/InventoryBrowser.tsx"), "utf8");
    expect(inventory).toContain("vehiclePresentation(v.trim).edition");
    expect(inventory).toContain("vehiclePresentation(vehicle.trim).edition === trim");
  });
});
