import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Volt & Vroom design system v1.2 RC", () => {
  it("uses the governed color, radius and accessibility tokens", () => {
    const css = read("app/globals.css");

    expect(css).toContain("--paper: #ffffff");
    expect(css).toContain("--soft: #f7f9fb");
    expect(css).toContain("--ice: #e6f2ff");
    expect(css).toContain("--electric: #168bff");
    expect(css).toContain("--ink: #0d1117");
    expect(css).toContain("--graphite: #687280");
    expect(css).toContain("--radius: 16px");
    expect(css).toContain("--radius-control: 12px");
    expect(css).toContain("0 0 0 4px var(--electric)");
    expect(css).toContain("prefers-reduced-motion:reduce");
  });

  it("ships the governed master symbol without the retired descriptor", () => {
    const symbol = read("public/brand/vv-symbol.svg");
    const logo = read("public/brand/vv-logo-horizontal.svg");

    expect(symbol).toContain("#168BFF");
    expect(logo).toContain("VOLT &amp; VROOM");
    expect(logo.toUpperCase()).not.toContain("AUTOMOTIVE");
  });

  it("uses the authentic web typography and governed public component layer", () => {
    const packageJson = JSON.parse(read("package.json"));
    const publicCss = read("app/public.css");
    const brandLogo = read("components/BrandLogo.tsx");

    expect(packageJson.dependencies).toHaveProperty("@fontsource-variable/manrope");
    expect(packageJson.dependencies).toHaveProperty("@fontsource-variable/inter");
    expect(publicCss).toContain("--vv-radius-card:20px");
    expect(publicCss).toContain("--vv-radius-control:999px");
    expect(publicCss).toContain("--vv-ink:#0d1117");
    expect(publicCss).toContain("--vv-glacier:#168bff");
    expect(publicCss).toContain("font-weight:300");
    expect(publicCss).not.toContain("Georgia");
    expect(brandLogo).toContain("/brand/vv-symbol.svg");
  });
});
