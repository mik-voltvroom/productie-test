import { afterEach, describe, expect, it } from "vitest";
import { parseHexonMutation } from "@/lib/integrations/hexon";
import { hexonCredentialsConfigured, verifyHexonAuthorization } from "@/lib/integrations/hexon-service";

const vehicleXml = `<?xml version="1.0" encoding="UTF-8"?>
<voertuig>
  <actie>toevoegen</actie>
  <voertuignr_hexon>5016729</voertuignr_hexon>
  <merk>Polestar</merk><model>2</model><type>Long Range Single Motor Plus 82 kWh</type>
  <bouwjaar>2024</bouwjaar><tellerstand>12.345</tellerstand><brandstof>Elektrisch</brandstof>
  <transmissie>Automaat</transmissie><carrosserie>Hatchback</carrosserie><kleur>Zwart</kleur><kenteken>AB-12-CD</kenteken>
  <verkoopprijs_particulier><bedrag>39.950,00</bedrag><munteenheid>EUR</munteenheid></verkoopprijs_particulier>
  <opmerkingen>Volledig elektrische Polestar.</opmerkingen>
  <afbeeldingen><afbeelding><url>https://images.example.test/polestar.jpg</url></afbeelding></afbeeldingen>
</voertuig>`;

const originalUser = process.env.HEXON_SYNC_USERNAME;
const originalPassword = process.env.HEXON_SYNC_PASSWORD;
afterEach(() => {
  if (originalUser === undefined) delete process.env.HEXON_SYNC_USERNAME; else process.env.HEXON_SYNC_USERNAME = originalUser;
  if (originalPassword === undefined) delete process.env.HEXON_SYNC_PASSWORD; else process.env.HEXON_SYNC_PASSWORD = originalPassword;
});

describe("Mobilox/Hexon incremental inventory", () => {
  it("maps a publishable VVOS vehicle in cents", () => {
    const mutation = parseHexonMutation(vehicleXml, new Date("2026-08-18T12:00:00.000Z"));
    expect(mutation.action).toBe("upsert");
    expect(mutation.providerAction).toBe("add");
    expect(mutation.externalId).toBe("5016729");
    expect(mutation.vehicle).toMatchObject({ id: "hexon-5016729", brand: "Polestar", model: "2", year: 2024, mileageKm: 12345, priceCents: 3995000, driveType: "electric", status: "available", images: ["https://images.example.test/polestar.jpg"] });
    expect(mutation.vehicle?.publication?.channels.website).toBe(true);
  });

  it("parses Hexon v2.25 attributes including actie=add", () => {
    const xml = vehicleXml
      .replace("<voertuig>", '<voertuig actie="add" voertuignr_hexon="56015851" voertuignr="5016729">')
      .replace("<actie>toevoegen</actie>", "")
      .replace("<voertuignr_hexon>5016729</voertuignr_hexon>", "");
    const mutation = parseHexonMutation(xml);
    expect(mutation.action).toBe("upsert");
    expect(mutation.providerAction).toBe("add");
    expect(mutation.externalId).toBe("56015851");
  });

  it("preserves change as provider action while using an upsert internally", () => {
    const xml = vehicleXml
      .replace("<voertuig>", '<voertuig actie="change">')
      .replace("<actie>toevoegen</actie>", "");
    const mutation = parseHexonMutation(xml);
    expect(mutation.action).toBe("upsert");
    expect(mutation.providerAction).toBe("change");
  });

  it("maps nested Hexon v2.25 pricing", () => {
    const nestedXml = vehicleXml.replace("<voertuignr_hexon>5016729</voertuignr_hexon>", "<voertuignr_hexon>56015851</voertuignr_hexon><voertuignr>5016729</voertuignr>").replace("<brandstof>Elektrisch</brandstof>", "<brandstof>E</brandstof>").replace("<verkoopprijs_particulier><bedrag>39.950,00</bedrag><munteenheid>EUR</munteenheid></verkoopprijs_particulier>", '<verkoopprijs_particulier><prijzen land="nl"><prijs nr="1"><bedrag>25911</bedrag><munteenheid>EUR</munteenheid></prijs></prijzen></verkoopprijs_particulier>');
    const mutation = parseHexonMutation(nestedXml);
    expect(mutation.vehicle).toMatchObject({ id: "hexon-56015851", priceCents: 2591100, driveType: "electric" });
  });

  it("imports the current Mobilox road-tax range and keeps the quarterly source period", () => {
    const xml = vehicleXml.replace(
      "</voertuig>",
      "<wltp_actieradius_elektrisch_combined>418</wltp_actieradius_elektrisch_combined><motorrijtuigen_belasting><min>198</min><max>216</max></motorrijtuigen_belasting></voertuig>",
    );
    const mutation = parseHexonMutation(xml);
    expect(mutation.vehicle).toMatchObject({
      wltpRangeKm: 418,
      roadTax: {
        quarterlyMinCents: 19_800,
        quarterlyMaxCents: 21_600,
        source: "mobilox-hexon",
        sourceField: "motorrijtuigen_belasting",
      },
    });
  });

  it("keeps compatibility with the former Hexon quarterly road-tax field", () => {
    const xml = vehicleXml.replace(
      "</voertuig>",
      "<wegenbelasting_kwartaal><min>60</min><max>67</max></wegenbelasting_kwartaal></voertuig>",
    );
    expect(parseHexonMutation(xml).vehicle?.roadTax).toEqual({
      quarterlyMinCents: 6_000,
      quarterlyMaxCents: 6_700,
      source: "mobilox-hexon",
      sourceField: "wegenbelasting_kwartaal",
    });
  });

  it("stores the Mobilox Audi SQ7 diesel payload as conventional inventory", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<voertuig actie="add" versie="2.25">
  <voertuignr_hexon>56318840</voertuignr_hexon><voertuignr>5031018</voertuignr>
  <klantnummer>103741</klantnummer><kenteken>RK044K</kenteken>
  <merk>Audi</merk><model>SQ7</model><type>4.0 TDI SQ7 quattro Pro Line + 7p</type>
  <bouwjaar>2017</bouwjaar><tellerstand eenheid="K">172334</tellerstand>
  <brandstof>D</brandstof><transmissie>A</transmissie><carrosserie>SUV</carrosserie><basiskleur>grijs</basiskleur>
  <gemiddeld_verbruik>7.2</gemiddeld_verbruik>
  <wltp_brandstofverbruik_combined></wltp_brandstofverbruik_combined>
  <wltp_brandstofverbruik_combined_weighted></wltp_brandstofverbruik_combined_weighted>
  <verkoopprijs_particulier><prijzen land="nl"><prijs nr="1"><bedrag>31990</bedrag><munteenheid>EUR</munteenheid></prijs></prijzen></verkoopprijs_particulier>
  <afbeeldingen><afbeelding><url>https://images.example.test/audi-sq7.jpg</url></afbeelding></afbeeldingen>
</voertuig>`;
    const mutation = parseHexonMutation(xml, new Date("2026-08-30T12:00:00.000Z"));
    expect(mutation).toMatchObject({ action: "upsert", providerAction: "add", externalId: "56318840" });
    expect(mutation.vehicle).toMatchObject({
      id: "hexon-56318840", licensePlate: "RK044K", brand: "Audi", model: "SQ7",
      year: 2017, mileageKm: 172334, priceCents: 3199000, driveType: "combustion",
      fuelType: "Diesel", consumptionPer100Km: 7.2, status: "available",
    });
    expect(mutation.vehicle?.publication?.validationErrors).toEqual([]);
  });

  it("honours tellerstand unit K and converts M to kilometres", () => {
    const kilometres = parseHexonMutation(vehicleXml.replace("<tellerstand>12.345</tellerstand>", '<tellerstand eenheid="K">12345</tellerstand>'));
    expect(kilometres.vehicle?.mileageKm).toBe(12345);

    const miles = parseHexonMutation(vehicleXml.replace("<tellerstand>12.345</tellerstand>", '<tellerstand eenheid="M">10000</tellerstand>'));
    expect(miles.vehicle?.mileageKm).toBe(16093);
  });

  it("archives attribute-style delete mutations", () => {
    expect(parseHexonMutation('<voertuig actie="delete" voertuignr="5016729" voertuignr_hexon="56015851"/>')).toEqual({ action: "archive", providerAction: "delete", externalId: "56015851" });
  });

  it("keeps incomplete vehicles out of the public website", () => {
    expect(() => parseHexonMutation(vehicleXml.replace("<tellerstand>12.345</tellerstand>", "<tellerstand/>"))).toThrow("kilometerstand");
  });

  it("preserves the full advert including specifications and contact text", () => {
    const escapedAdvert = "Eigen tekst over de auto.&lt;br /&gt;&lt;br /&gt;&lt;b&gt;Polestar 2&lt;/b&gt;&lt;br /&gt;&lt;ul&gt;&lt;li&gt;&lt;b&gt;Kenteken&lt;/b&gt;: HXP-41-S&lt;/li&gt;&lt;li&gt;&lt;b&gt;Merk&lt;/b&gt;: Polestar&lt;/li&gt;&lt;/ul&gt;&lt;br /&gt;&lt;b&gt;Volt &amp;amp; Vroom&lt;/b&gt;&lt;br /&gt;Groningen &amp;euro; 270 &amp;quot;test&amp;quot; be&amp;iuml;nvloeden.";
    const xml = vehicleXml.replace("Volledig elektrische Polestar.", escapedAdvert);
    const mutation = parseHexonMutation(xml);
    expect(mutation.vehicle?.description).toContain("Eigen tekst over de auto.");
    expect(mutation.vehicle?.description).toContain("Groningen € 270");
    expect(mutation.vehicle?.description).not.toContain("&lt;");
    expect(mutation.vehicle?.description).toContain("Kenteken");
  });

  it("decodes nested HTML entities in free advert text", () => {
    const xml = vehicleXml.replace("Volledig elektrische Polestar.", "Prijs &amp;euro; 39.950 en dit kan be&amp;iuml;nvloeden.");
    const mutation = parseHexonMutation(xml);
    expect(mutation.vehicle?.description).toBe("Prijs € 39.950 en dit kan beïnvloeden.");
  });

  it("rejects entity declarations and unknown fuel codes", () => {
    expect(() => parseHexonMutation('<!DOCTYPE x [<!ENTITY x "boom">]><voertuig><voertuignr_hexon>&x;</voertuignr_hexon></voertuig>')).toThrow("DTD en entities");
    expect(() => parseHexonMutation(vehicleXml.replace("<brandstof>Elektrisch</brandstof>", "<brandstof>ONBEKEND</brandstof>"))).toThrow("Niet-ondersteunde aandrijving");
  });

  it("uses one fail-closed Basic Auth configuration", () => {
    process.env.HEXON_SYNC_USERNAME = "feed";
    process.env.HEXON_SYNC_PASSWORD = "Volt1";
    expect(hexonCredentialsConfigured()).toBe(true);
    expect(verifyHexonAuthorization(`Basic ${Buffer.from("feed:Volt1").toString("base64")}`)).toBe(true);
    expect(verifyHexonAuthorization(`Basic ${Buffer.from("feed:wrong").toString("base64")}`)).toBe(false);
    delete process.env.HEXON_SYNC_PASSWORD;
    expect(hexonCredentialsConfigured()).toBe(false);
    expect(verifyHexonAuthorization(`Basic ${Buffer.from("feed:Volt1").toString("base64")}`)).toBe(false);
  });
});
