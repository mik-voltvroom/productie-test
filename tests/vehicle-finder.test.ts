import { describe, expect, it } from "vitest";
import { matchVehicles, matchesBudget, vehicleFinderAnswersSchema, type VehicleFinderAnswers } from "@/lib/vehicle-finder/business";
import type { DriveType, Vehicle, VehicleStatus } from "@/types";

function vehicle(id: string, driveType: DriveType, priceCents: number, status: VehicleStatus = "available", patch: Partial<Vehicle> = {}): Vehicle {
  return {
    id,
    slug: id.toLowerCase(),
    brand: "Test",
    model: id,
    trim: "Uitvoering",
    year: 2024,
    mileageKm: 25_000,
    priceCents,
    driveType,
    fuelType: driveType === "electric" ? "Elektrisch" : "Benzine / elektrisch",
    transmission: "Automaat",
    bodyStyle: "SUV",
    color: "Blauw",
    maintenanceHistory: "complete",
    images: [`https://example.test/${id}.jpg`],
    highlights: [],
    status,
    locationCode: "GRONINGEN",
    updatedAt: "2026-10-16T08:00:00.000Z",
    ...patch,
  };
}

const answers: VehicleFinderAnswers = {
  budget: "any",
  annualKm: "10000-20000",
  charging: "home",
  usage: "mixed",
  preference: "advise",
};

describe("deterministische voertuigmatching", () => {
  it("valideert alle vijf antwoorden servergeschikt en weigert extra invoer", () => {
    expect(vehicleFinderAnswersSchema.safeParse(answers).success).toBe(true);
    expect(vehicleFinderAnswersSchema.safeParse({ ...answers, charging: "garage" }).success).toBe(false);
    expect(vehicleFinderAnswersSchema.safeParse({ ...answers, email: "niet-nodig@example.test" }).success).toBe(false);
  });

  it("past de budgetgrenzen reproduceerbaar toe", () => {
    expect(matchesBudget(2_000_000, "up-to-20000")).toBe(true);
    expect(matchesBudget(2_000_001, "up-to-20000")).toBe(false);
    expect(matchesBudget(2_000_001, "20000-30000")).toBe(true);
    expect(matchesBudget(3_000_000, "20000-30000")).toBe(true);
    expect(matchesBudget(4_500_001, "45000-plus")).toBe(true);
    expect(matchesBudget(0, "any")).toBe(false);
  });

  it("filtert niet-beschikbare, fossiele en niet-passende voertuigen uit", () => {
    const inventory = [
      vehicle("EV", "electric", 2_900_000),
      vehicle("PHEV", "plug-in-hybrid", 3_400_000),
      vehicle("SOLD", "electric", 2_700_000, "sold"),
      vehicle("PETROL", "combustion", 2_500_000),
    ];
    const result = matchVehicles(inventory, { ...answers, budget: "20000-30000", preference: "electric" });
    expect(result.map(match => match.vehicle.id)).toEqual(["EV"]);
  });

  it("rangschikt zonder laadmogelijkheid een full hybrid boven laadbare alternatieven", () => {
    const result = matchVehicles([
      vehicle("EV", "electric", 3_000_000),
      vehicle("PHEV", "plug-in-hybrid", 3_000_000),
      vehicle("HEV", "full-hybrid", 3_000_000),
    ], { ...answers, charging: "none", usage: "long-distance" });
    expect(result[0].vehicle.id).toBe("HEV");
    expect(result[0].reasons).toContain("Een full hybrid hoeft niet extern te worden opgeladen.");
  });

  it("verzint geen bereik en benoemt ontbrekende openbare bereikdata", () => {
    const result = matchVehicles([vehicle("EV", "electric", 3_000_000)], { ...answers, preference: "electric" });
    expect(result[0].vehicle.wltpRangeKm).toBeUndefined();
    expect(result[0].vehicle.realisticRangeKm).toBeUndefined();
    expect(result[0].cautions).toContain("Voor deze auto is geen bereikwaarde in de huidige openbare data beschikbaar.");
  });

  it("sorteert gelijke scores stabiel op prijs en daarna op ID", () => {
    const result = matchVehicles([
      vehicle("B", "electric", 3_000_000),
      vehicle("A", "electric", 3_000_000),
      vehicle("C", "electric", 2_900_000),
    ], answers);
    expect(result.map(match => match.vehicle.id)).toEqual(["C", "A", "B"]);
  });
});
