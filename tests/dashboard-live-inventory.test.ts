import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

describe("VVOS dashboardvoorraad", () => {
  it("laadt productiegegevens via de bestaande repositories", () => {
    const dashboard = readFileSync(resolve(repositoryRoot, "app/dashboard/page.tsx"), "utf8");

    expect(dashboard).toContain("listVehicles()");
    expect(dashboard).toContain("listLeads()");
    expect(dashboard).not.toContain("@/lib/demo-store");
  });

  it("toont geen fictieve nulwaarden als actuele gegevens niet beschikbaar zijn", () => {
    const dashboard = readFileSync(resolve(repositoryRoot, "app/dashboard/page.tsx"), "utf8");

    expect(dashboard).toContain("dataUnavailable");
    expect(dashboard).toContain("Actuele VVOS-gegevens konden niet worden geladen.");
    expect(dashboard).toContain("Nog geen voertuigen in de actuele voorraad.");
  });
});
