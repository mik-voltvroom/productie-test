import { describe, expect, it } from "vitest";
import { normalizeLicensePlate, tradeInSubmissionSchema } from "@/lib/inruil/validation";

const validSubmission = {
  licensePlate: "12-AB-34",
  mileageKm: "85000",
  brand: "VOLVO",
  model: "XC60",
  year: "2020",
  condition: "good",
  maintenanceHistory: "complete",
  keys: "two",
  options: "",
  damage: "",
  desiredVehicleId: "",
  desiredVehicleLabel: "",
  name: "Test Aanvrager",
  email: "test@example.com",
  phone: "",
  contactPreference: "email",
  consent: "on",
  website: "",
};

describe("inruilvalidatie", () => {
  it("normaliseert Nederlandse kentekens zonder de waarde te raden", () => {
    expect(normalizeLicensePlate("12-ab-34")).toBe("12AB34");
  });

  it("accepteert een complete inruilaanvraag", () => {
    const result = tradeInSubmissionSchema.safeParse(validSubmission);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.licensePlate).toBe("12AB34");
      expect(result.data.mileageKm).toBe(85000);
    }
  });

  it("weigert een aanvraag zonder contactmogelijkheid", () => {
    const result = tradeInSubmissionSchema.safeParse({ ...validSubmission, email: "", phone: "" });
    expect(result.success).toBe(false);
  });

  it("vereist een toelichting wanneer schade is gekozen", () => {
    const result = tradeInSubmissionSchema.safeParse({ ...validSubmission, condition: "damage", damage: "" });
    expect(result.success).toBe(false);
  });
});
