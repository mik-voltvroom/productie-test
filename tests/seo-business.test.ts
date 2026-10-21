import { describe, expect, it } from "vitest";
import { canonicalUrl, seoConfiguration, serializeJsonLd } from "@/lib/seo/business";
import { publicInventoryMode } from "@/lib/environment/business";

const production = { VVOS_ENV: "production", VVOS_DATA_MODE: "firebase", NEXT_PUBLIC_SITE_URL: "https://www.voltvroom.nl" };
describe("SEO environment and canonical policy", () => {
  it("never selects demo inventory from absent or hosted configuration", () => {
    expect(publicInventoryMode({})).toBe("firebase");
    expect(publicInventoryMode({ VVOS_ENV: "local", VVOS_DATA_MODE: "demo" })).toBe("demo");
    expect(() => publicInventoryMode({ VVOS_ENV: "staging", VVOS_DATA_MODE: "demo" })).toThrow();
    expect(() => publicInventoryMode({ VVOS_ENV: "local", VVOS_DATA_MODE: "demo", K_SERVICE: "hosted" })).toThrow();
  });
  it.each([
    [production, true], [{ ...production, NEXT_PUBLIC_SITE_URL: "https://voltvroom.nl/" }, true],
    [{ ...production, VVOS_ENV: "staging" }, false], [{ ...production, VVOS_ENV: "preview" }, false],
    [{ ...production, VVOS_DATA_MODE: "demo" }, false], [{ ...production, VVOS_ENV: undefined }, false],
    [{ ...production, NEXT_PUBLIC_SITE_URL: undefined }, false], [{ ...production, NEXT_PUBLIC_SITE_URL: "https://voltvroom.nl.evil.test" }, false],
    [{ ...production, NEXT_PUBLIC_SITE_URL: "https://www.voltvroom.nl/path" }, false],
    [{ ...production, NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" }, false],
    [{ ...production, NEXT_PUBLIC_SITE_URL: "https://user:password@www.voltvroom.nl" }, false],
    [{ ...production, NEXT_PUBLIC_SITE_URL: "http://www.voltvroom.nl" }, false],
    [{ ...production, VERCEL_ENV: "preview" }, false], [{}, false],
  ])("indexes only explicitly configured production: %j", (env, expected) => {
    expect(seoConfiguration(env).indexable).toBe(expected);
  });
  it("normalizes apex, slash and tracking without changing encoded segments", () => {
    expect(canonicalUrl('/voorraad/a%2Fb%20%26%20%C3%A9/?utm_source=test#x', production)).toBe('https://www.voltvroom.nl/voorraad/a%2Fb%20%26%20%C3%A9');
    expect(canonicalUrl('/', { ...production, NEXT_PUBLIC_SITE_URL: "https://voltvroom.nl/" })).toBe('https://www.voltvroom.nl/');
  });
  it.each(['https://evil.test', '//evil.test', '/\\evil.test'])('rejects external canonical input %s', path => {
    expect(() => canonicalUrl(path, production)).toThrow();
  });
  it("escapes script termination while preserving the original JSON value", () => {
    const input = { name: '</script><script>alert("x")</script>&é\u2028\u2029' };
    const output = serializeJsonLd(input);
    expect(output).not.toContain('<'); expect(JSON.parse(output)).toEqual(input);
  });
});
