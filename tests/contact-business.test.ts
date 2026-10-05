import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contactContext, contactLeadMessage, contactVehicle, leadSubmissionSchema, todayInGroningen, vehicleContactHref } from "@/lib/contact/business";

const vehicles = [contactVehicle({ id: "HEXON-123", brand: "Volvo", model: "XC40", trim: "Recharge" })];
const general = { name: " Test Aanvrager ", email: "test@example.com", consent: true };
const testDrive = { ...general, vehicleId: "HEXON-123", interest: "Proefrit plannen", testDrive: { preferredDate: "2026-10-12", daypart: "afternoon" } };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T10:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("voertuiggebonden contact", () => {
  it("neemt alleen een actueel voorraad-ID over en bepaalt de titel uit de voorraad", () => {
    expect(vehicles[0]).toEqual({ id: "HEXON-123", label: "Volvo XC40 Recharge" });
    expect(contactContext(vehicles, { vehicleId: "HEXON-123", intent: "proefrit" })).toEqual({ initialVehicleId: "HEXON-123", initialInterest: "Proefrit plannen", vehicleNotice: "" });
    expect(contactContext(vehicles, { vehicleId: "HEXON-123", intent: "vraag" }).initialInterest).toBe("Vraag over voorraad");
  });
  it.each(["", "unknown", "deleted", "../private", ".", "..", "x".repeat(121), ["HEXON-123", "other"]])("laat een onbruikbare link opnieuw kiezen: %j", vehicleId => {
    const context = contactContext(vehicles, { vehicleId, intent: "proefrit" });
    expect(context.initialVehicleId).toBe("");
    expect(context.vehicleNotice).toContain("actuele voorraad");
  });
  it("behoudt algemene contactaanvragen en onbekende intenties", () => {
    expect(contactContext([], {})).toEqual({ initialVehicleId: "", initialInterest: "Adviesgesprek", vehicleNotice: "" });
    expect(contactContext(vehicles, { intent: ["proefrit", "vraag"] }).initialInterest).toBe("Adviesgesprek");
  });
  it("houdt speciale ID-tekens intact in deeplinks", () => {
    const href = new URL(vehicleContactHref("ID &?#é", "proefrit"), "https://www.voltvroom.nl");
    expect(href.pathname).toBe("/contact");
    expect(href.searchParams.get("vehicleId")).toBe("ID &?#é");
    expect(href.searchParams.get("intent")).toBe("proefrit");
    expect(href.hash).toBe("#aanvraag");
  });
});

describe("gedeelde client/server-validatie", () => {
  it("accepteert normaal contact en legacy keuzehulp zonder auto of moment", () => {
    const result = leadSubmissionSchema.parse({ ...general, vehicleId: "", phone: "", budgetEur: 30000, hasTradeIn: true });
    expect(result.name).toBe("Test Aanvrager");
    expect(result.vehicleId).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.budgetEur).toBe(30000);
    expect(contactLeadMessage({ ...result, message: "Legacy keuzehulp" })).toBe("Legacy keuzehulp");
    expect(leadSubmissionSchema.safeParse({ name: "Test", phone: "+31 (0)6 12345678", consent: true }).success).toBe(true);
  });
  it("accepteert proefritvoorkeuren en maakt de aanvraag zichtbaar in het bestaande CRM-bericht", () => {
    const data = leadSubmissionSchema.parse(testDrive);
    const message = contactLeadMessage(data, "Volvo XC40 Recharge");
    expect(message).toContain("HEXON-123");
    expect(message).toContain("Volvo XC40 Recharge");
    expect(message).toContain("2026-10-12, Middag");
    expect(message).toContain("pas definitief na bevestiging");
    expect(leadSubmissionSchema.safeParse({ ...testDrive, testDrive: { preferredDate: "2026-10-05", daypart: "any" } }).success).toBe(true);
  });
  it.each([
    { name: " " }, { name: "x" }, { email: "bad" }, { email: "", phone: "" },
    { phone: "abcdefgh" }, { phone: "1234567" }, { consent: false }, { website: "spam" },
    { preferredContact: "phone" }, { preferredContact: "email", email: "", phone: "0612345678" },
    { message: "x".repeat(2001) }, { interest: "unknown" }, { vehicleId: "private/id" },
  ])("weigert ongeldige contactgegevens: %j", patch => {
    expect(leadSubmissionSchema.safeParse({ ...general, ...patch }).success).toBe(false);
  });
  it.each([
    { vehicleId: "" }, { testDrive: undefined },
    { testDrive: { preferredDate: "2026-10-04", daypart: "morning" } },
    { testDrive: { preferredDate: "2026-02-30", daypart: "morning" } },
    { testDrive: { preferredDate: "2027-02-29", daypart: "morning" } },
    { testDrive: { preferredDate: "12-10-2026", daypart: "morning" } },
    { testDrive: { preferredDate: "2026-10-12", daypart: "evening" } },
    { interest: "Adviesgesprek" },
  ])("weigert ontbrekende of ongeldige proefritvoorkeuren: %j", patch => {
    expect(leadSubmissionSchema.safeParse({ ...testDrive, ...patch }).success).toBe(false);
  });
  it("gebruikt de lokale dag in Groningen, ook rond middernacht en zomertijd", () => {
    expect(todayInGroningen(new Date("2026-10-05T22:30:00Z"))).toBe("2026-10-06");
    expect(todayInGroningen(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-02");
    expect(leadSubmissionSchema.safeParse({ ...testDrive, testDrive: { preferredDate: "2028-02-29", daypart: "morning" } }).success).toBe(true);
  });
});
