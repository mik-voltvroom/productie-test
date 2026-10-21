import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("inruilbevestiging", () => {
  it("spreekt namens Volt & Vroom zonder een medewerker te beloven", () => {
    const form = readFileSync(resolve(process.cwd(), "components/TradeInForm.tsx"), "utf8");

    expect(form).toContain("Dank u. Volt &amp; Vroom bekijkt uw aanvraag.");
    expect(form).toContain("Ons team neemt zo snel mogelijk contact met u op.");
    expect(form).not.toContain("Mik bekijkt uw auto persoonlijk");
    expect(form).not.toContain("Mik neemt persoonlijk contact met u op");
  });
});
