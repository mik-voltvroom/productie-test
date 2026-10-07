import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("publieke voorraadpagina", () => {
  it("toont randloze vervagende categoriekaarten en de korte volledig-aanbodactie", () => {
    const browser = read("components/InventoryBrowser.tsx");
    const styles = read("app/voorraad/voorraad.module.css");
    expect(browser).not.toContain("Kies een categorie");
    expect(browser).not.toContain("Welk type auto zoekt u?");
    expect(browser).toContain('value="all" onSelect={selectCategory}>Volledig aanbod');
    expect(styles).toMatch(/\.categoryChoice \{[^}]*border:0;[^}]*background:transparent;[^}]*box-shadow:none;/);
    expect(styles).toMatch(/\.categoryChoice \{[^}]*appearance:none;[^}]*-webkit-appearance:none;[^}]*outline:0;/);
    expect(styles).toContain("var(--category-image)");
    expect(styles).toContain("linear-gradient(0deg,#f7f9fa");
    expect(styles).toContain("linear-gradient(90deg,#f7f9fa");
    expect(styles).toContain(".categoryChoice:focus-visible");
    expect(styles).toContain(".categoryChoice.categoryActive strong");
    expect(styles).toContain(".categoryChoices{grid-template-columns:1fr");
  });

  it("accentueert alleen aanbod in de voorraadkop", () => {
    const page = read("app/voorraad/page.tsx");
    const styles = read("app/voorraad/voorraad.module.css");

    expect(page).toContain("Ons <em>aanbod.</em>");
    expect(styles).toContain(".intro h1 em{color:#168bff;font-style:normal}");
  });

  it("gebruikt de VV-huisstijl in het filterblok", () => {
    const browser = read("components/InventoryBrowser.tsx");
    const styles = read("app/voorraad/voorraad.module.css");

    expect(browser).toContain("<label>Brandstof<select");
    expect(browser).toContain('value="">Alle brandstoffen</option>');
    expect(browser).toContain("<label>Uitvoering<select");
    expect(browser).not.toContain("<label>Trim<select");
    expect(styles).toContain("color:#168bff;font-family:var(--font-manrope),Manrope,sans-serif");
    expect(styles).toContain("background-image:url(\"/brand/vv-symbol.svg\")");
    expect(styles).toContain("appearance:none;-webkit-appearance:none");
  });

  it("opent het volledige aanbod vanuit desktop- en mobiele navigatie", () => {
    const header = read("components/Header.tsx");

    expect(header).toContain('{ href: "/voorraad", label: "Aanbod" }');
    expect(header).not.toContain('{ href: "/#uitgelicht", label: "Aanbod" }');
    expect(header).toContain("primaryLinks[0]");
  });

  it("wist alle actieve filters voordat een snelcategorie wordt gekozen", () => {
    const inventoryBrowser = read("components/InventoryBrowser.tsx");
    const selectCategory = inventoryBrowser.match(/function selectCategory\(next: Category\) \{([\s\S]*?)\n  \}/)?.[1];

    expect(selectCategory).toBeDefined();
    expect(selectCategory).toMatch(/resetFilters\(\);\s+setCategory\(next\);/);
    for (const setter of ["setBrand", "setModel", "setDriveType", "setFuelType", "setTrim", "setYearFrom", "setYearTo", "setPriceFrom", "setPriceTo"]) {
      expect(inventoryBrowser).toContain(`${setter}("")`);
    }
    expect(inventoryBrowser).toContain('value="all" onSelect={selectCategory}');
  });

  it("projecteert prijs, foto en detail-link vanuit het canonieke voertuigmodel", () => {
    const inventoryPage = read("app/voorraad/page.tsx");
    const inventoryBrowser = read("components/InventoryBrowser.tsx");

    expect(inventoryPage).toContain('@/lib/repositories/public-vehicle-repository');
    expect(inventoryPage).toContain("listPublicVehicles(100)");
    expect(inventoryPage).toContain("<InventoryBrowser vehicles={vehicles}");
    expect(inventoryBrowser).toContain("vehicle.images[0]");
    expect(inventoryBrowser).toContain("centsToEuros(vehicle.priceCents)");
    expect(inventoryBrowser).toContain("vehicle.slug");
    expect(inventoryBrowser).toContain('value="all">Hele voorraad');
    expect(inventoryBrowser).toContain('value="icons"');
    expect(inventoryBrowser).toContain('/brand/icons/hybride-3d.webp');
    expect(inventoryBrowser).toContain('/brand/icons/elektrisch-3d.webp');
    expect(inventoryBrowser).toContain('aria-label="Snel naar een aanbodcategorie"');
    const inventoryStyles = read("app/voorraad/voorraad.module.css");
    expect(inventoryStyles).toContain('/editorial/home-hybrid-card-v1.jpg');
    expect(inventoryStyles).toContain('/editorial/home-electric-card-v1.jpg');
    expect(inventoryStyles).toContain('/editorial/home-icons-card-v1.jpg');
    expect(inventoryPage).not.toContain('@/lib/public-vehicles');
  });

  it("toont op de homepage alle auto's met categorieen maar zonder filterpaneel", () => {
    const homepage = read("app/page.tsx");
    const inventoryBrowser = read("components/InventoryBrowser.tsx");
    const styles = read("app/voorraad/voorraad.module.css");

    expect(homepage).toContain("const vehicles = await listPublicVehicles(100)");
    expect(homepage).toContain("<InventoryBrowser vehicles={vehicles} showFilters={false}");
    expect(homepage).not.toContain(".slice(0, 6)");
    expect(inventoryBrowser).toContain("showFilters = true");
    expect(inventoryBrowser).toContain("showFilters ? <aside");
    expect(styles).toContain(".layoutWithoutFilters{grid-template-columns:minmax(0,1fr)}");
    expect(styles).toContain(".layoutWithoutFilters .grid{grid-template-columns:repeat(3,minmax(0,1fr))}");
  });

  it("uses the canonical Mobilox content across inventory and feeds", () => {
    expect(read("components/dashboard/VehicleForm.tsx")).not.toContain("uploadVehicleImage");
    expect(read("lib/integrations/hexon-service.ts")).toContain("buildMobiloxReplacement");
    expect(read("lib/integrations/hexon-service.ts")).not.toContain("preservePublicImageSelection");
    expect(read("lib/merchant.ts")).toContain("getPublicVehicleImages");
  });
});
