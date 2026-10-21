import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("financial lease UI", () => {
  const component = fs.readFileSync("components/financial-lease/LeaseCalculator.tsx", "utf8");
  const page = fs.readFileSync("app/voorraad/[slug]/page.tsx", "utf8");

  it("keeps amount inputs empty so zero never blocks direct typing", () => {
    expect(component).toContain('useState("")');
    expect(component).toContain('value={downPayment}');
    expect(component).toContain('value={balloon}');
    expect(component).toContain('placeholder="0"');
    expect(component).not.toContain("rekenrente");
  });

  it("places the compact calculator directly after the asking price", () => {
    expect(page).toMatch(/className=\{styles\.price\}[\s\S]*?<LeaseCalculator[^>]* compact \/>/);
    expect(page.indexOf("<LeaseCalculator")).toBeLessThan(page.indexOf("className={styles.priceNote}"));
    expect((page.match(/<LeaseCalculator/g) ?? []).length).toBe(1);
    expect(component).toContain('"Direct aanvragen"');
    expect(component).toContain('id="lease-lead-form"');
    expect(component).toContain("formHeading.current?.focus()");
    expect(page).toContain("De auto gezien.");
    expect(page).toContain("Nu het verhaal erachter.");
  });
});
