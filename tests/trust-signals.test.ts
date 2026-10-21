// @vitest-environment jsdom

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrustSignals } from "@/components/TrustSignals";

describe("homepage trust signals", () => {
  it("renders three indexable arguments with conditional battery claims and decorative icons", () => {
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(createElement(TrustSignals));
    const section = root.querySelector('section[aria-label="Onze expertise en werkwijze"]');
    const items = Array.from(section?.querySelectorAll("ul > li") ?? []);

    expect(items.map(item => item.querySelector("h2")?.textContent)).toEqual([
      "Transparant advies",
      "Inzicht in accugezondheid",
      "Zorgvuldig geselecteerd",
    ]);
    expect(items[1].querySelector("p")?.textContent).toBe(
      "Waar beschikbaar onderbouwd met technische accugegevens en metingen.",
    );
    expect(section?.textContent).not.toMatch(/CarCheck|garantie|gecertificeerd|getest/i);
    for (const item of items) {
      const icon = item.querySelector("img");
      expect(icon?.getAttribute("alt")).toBe("");
      expect(icon?.getAttribute("width")).toBe("28");
      expect(fs.existsSync(path.join(process.cwd(), "public", icon?.getAttribute("src") ?? ""))).toBe(true);
    }
  });

  it("links to the existing approach page and sits directly after the homepage hero", () => {
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(createElement(TrustSignals));
    const link = root.querySelector("section a");
    expect(link?.getAttribute("href")).toBe("/vv-verified");
    expect(link?.textContent).toContain("Ontdek onze werkwijze");
    expect(link?.querySelector("span")?.getAttribute("aria-hidden")).toBe("true");
    expect(fs.existsSync(path.join(process.cwd(), "app/vv-verified/page.tsx"))).toBe(true);

    const homepage = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    expect(homepage).toMatch(/<\/section>\s*<TrustSignals \/>\s*<div id="uitgelicht">/);
  });
});
