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
  });

  it("places the calculator directly before the final appointment section", () => {
    expect(page.indexOf("<LeaseCalculator")).toBeGreaterThan(page.indexOf("className={styles.story}"));
    expect(page.indexOf("<LeaseCalculator")).toBeLessThan(page.indexOf("className={styles.contact}"));
    expect(page).toContain("De auto gezien.");
    expect(page).toContain("Nu het verhaal erachter.");
  });
});
