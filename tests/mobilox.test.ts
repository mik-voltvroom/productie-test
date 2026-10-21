import { afterEach, describe, expect, it } from "vitest";
import { mobiloxSuccessResponse, normalizeMobiloxMutation, parseMobiloxIncrementalXml, verifyMobiloxBasicAuth } from "@/lib/integrations/mobilox";

const originalUser = process.env.MOBILOX_BASIC_AUTH_USERNAME;
const originalPassword = process.env.MOBILOX_BASIC_AUTH_PASSWORD;

afterEach(() => {
  if (originalUser === undefined) delete process.env.MOBILOX_BASIC_AUTH_USERNAME; else process.env.MOBILOX_BASIC_AUTH_USERNAME = originalUser;
  if (originalPassword === undefined) delete process.env.MOBILOX_BASIC_AUTH_PASSWORD; else process.env.MOBILOX_BASIC_AUTH_PASSWORD = originalPassword;
});

describe("Mobilox / Hexon incremental XML", () => {
  it("normalizes a nested add payload including hybrid data and images", () => {
    const mutation = normalizeMobiloxMutation(`<?xml version="1.0"?><voertuig>
      <actie>add</actie><voertuignr_hexon>847231</voertuignr_hexon><kenteken>GRT-42-P</kenteken>
      <merk>Volvo</merk><model>XC60</model><type>T6 Recharge AWD</type><bouwjaar>2022</bouwjaar>
      <tellerstand>68450</tellerstand><verkoopprijs_particulier_bedrag>42950</verkoopprijs_particulier_bedrag>
      <plugin_hybride>J</plugin_hybride><accu_conditie>94</accu_conditie><actieradius_elektrisch>72</actieradius_elektrisch>
      <afbeeldingen><foto>https://cdn.example.test/1.jpg</foto><foto>https://cdn.example.test/2.jpg</foto></afbeeldingen>
    </voertuig>`);
    expect(mutation).toMatchObject({ action: "add", providerVehicleId: "847231", brand: "Volvo", model: "XC60", year: 2022, mileage: 68450, retailPrice: 42950 });
    expect(mutation.hybrid).toMatchObject({ pluginHybrid: true, batteryConditionPct: 94, electricRangeKm: 72 });
    expect(mutation.imageUrls).toEqual(["https://cdn.example.test/1.jpg", "https://cdn.example.test/2.jpg"]);
  });

  it("accepts change and delete mutations", () => {
    expect(normalizeMobiloxMutation("<root><actie>change</actie><voertuignr_hexon>42</voertuignr_hexon></root>").action).toBe("change");
    expect(normalizeMobiloxMutation("<root><actie>delete</actie><voertuignr_hexon>42</voertuignr_hexon></root>").action).toBe("delete");
  });

  it("rejects unsafe or incomplete XML", () => {
    expect(() => parseMobiloxIncrementalXml('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>')).toThrow(/DTD\/entities/);
    expect(() => normalizeMobiloxMutation("<root><actie>add</actie></root>")).toThrow(/voertuignr_hexon/);
    expect(() => normalizeMobiloxMutation("<root><actie>unknown</actie><voertuignr_hexon>1</voertuignr_hexon></root>")).toThrow();
  });

  it("verifies Basic Auth without exposing credentials", () => {
    process.env.MOBILOX_BASIC_AUTH_USERNAME = "feed-user";
    process.env.MOBILOX_BASIC_AUTH_PASSWORD = "test-only-password";
    const valid = `Basic ${Buffer.from("feed-user:test-only-password").toString("base64")}`;
    const invalid = `Basic ${Buffer.from("feed-user:wrong").toString("base64")}`;
    expect(verifyMobiloxBasicAuth(valid)).toBe(true);
    expect(verifyMobiloxBasicAuth(invalid)).toBe(false);
    expect(verifyMobiloxBasicAuth(null)).toBe(false);
  });

  it("returns the Hexon success acknowledgement", () => {
    expect(mobiloxSuccessResponse()).toBe("1");
  });
});
