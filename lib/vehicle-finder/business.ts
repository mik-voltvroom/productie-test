import { z } from "zod";
import type { DriveType, Vehicle } from "@/types";

export const vehicleFinderAnswersSchema = z.object({
  budget: z.enum(["up-to-20000", "20000-30000", "30000-45000", "45000-plus", "any"]),
  annualKm: z.enum(["under-10000", "10000-20000", "20000-30000", "over-30000"]),
  charging: z.enum(["home", "work", "public", "none"]),
  usage: z.enum(["city", "commute", "long-distance", "mixed"]),
  preference: z.enum(["electric", "plug-in-hybrid", "full-hybrid", "advise"]),
}).strict();

export type VehicleFinderAnswers = z.infer<typeof vehicleFinderAnswersSchema>;

export type VehicleFinderMatch = {
  vehicle: Vehicle;
  score: number;
  reasons: string[];
  cautions: string[];
};

const driveLabels: Record<Exclude<DriveType, "combustion">, string> = {
  electric: "volledig elektrisch",
  "plug-in-hybrid": "plug-in hybride",
  "full-hybrid": "hybride",
};

function isSupportedDriveType(driveType: DriveType): driveType is Exclude<DriveType, "combustion"> {
  return driveType !== "combustion";
}

export function matchesBudget(priceCents: number, budget: VehicleFinderAnswers["budget"]): boolean {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return false;
  if (budget === "any") return true;
  if (budget === "up-to-20000") return priceCents <= 2_000_000;
  if (budget === "20000-30000") return priceCents > 2_000_000 && priceCents <= 3_000_000;
  if (budget === "30000-45000") return priceCents > 3_000_000 && priceCents <= 4_500_000;
  return priceCents > 4_500_000;
}

function preferenceMatches(driveType: DriveType, preference: VehicleFinderAnswers["preference"]): boolean {
  return preference === "advise" ? isSupportedDriveType(driveType) : driveType === preference;
}

function scoreCharging(driveType: Exclude<DriveType, "combustion">, charging: VehicleFinderAnswers["charging"]) {
  if (charging === "none") return driveType === "full-hybrid" ? 4 : driveType === "plug-in-hybrid" ? -2 : -4;
  if (charging === "public") return driveType === "full-hybrid" ? 1 : 2;
  return driveType === "electric" ? 4 : driveType === "plug-in-hybrid" ? 3 : 1;
}

function scoreUsage(driveType: Exclude<DriveType, "combustion">, usage: VehicleFinderAnswers["usage"], charging: VehicleFinderAnswers["charging"]) {
  if (usage === "city") return driveType === "electric" ? 3 : 2;
  if (usage === "commute") return driveType === "full-hybrid" ? 2 : charging === "none" ? 0 : 3;
  if (usage === "long-distance") return driveType === "full-hybrid" ? 3 : driveType === "plug-in-hybrid" ? (charging === "none" ? 0 : 2) : (charging === "none" ? -2 : 1);
  return 2;
}

function scoreAnnualKm(driveType: Exclude<DriveType, "combustion">, annualKm: VehicleFinderAnswers["annualKm"], charging: VehicleFinderAnswers["charging"]) {
  if (annualKm === "under-10000") return driveType === "full-hybrid" ? 2 : 1;
  if (annualKm === "10000-20000") return 2;
  if (annualKm === "20000-30000") return driveType === "electric" && charging !== "none" ? 3 : driveType === "plug-in-hybrid" && charging !== "none" ? 2 : 2;
  return driveType === "electric" && (charging === "home" || charging === "work") ? 3 : driveType === "full-hybrid" ? 3 : 1;
}

function explanation(vehicle: Vehicle, answers: VehicleFinderAnswers): { reasons: string[]; cautions: string[] } {
  const driveType = vehicle.driveType as Exclude<DriveType, "combustion">;
  const reasons: string[] = [];
  const cautions: string[] = [];
  if (answers.budget !== "any") reasons.push("De prijs valt binnen uw gekozen budget.");
  if (answers.preference !== "advise") reasons.push(`Dit is een ${driveLabels[driveType]} auto, passend bij uw gekozen voorkeur.`);
  if ((answers.charging === "home" || answers.charging === "work") && (driveType === "electric" || driveType === "plug-in-hybrid")) {
    reasons.push(`Uw mogelijkheid om ${answers.charging === "home" ? "thuis" : "op het werk"} te laden ondersteunt regelmatig laden.`);
  } else if (answers.charging === "none" && driveType === "full-hybrid") {
    reasons.push("Een full hybrid hoeft niet extern te worden opgeladen.");
  }
  if (answers.usage === "city" && (driveType === "electric" || driveType === "full-hybrid")) reasons.push("Deze aandrijflijn sluit aan bij veel stadsgebruik.");
  if (answers.usage === "commute" && driveType !== "full-hybrid" && answers.charging !== "none") reasons.push("Regelmatig laden past bij uw woon-werkgebruik.");
  if (answers.usage === "long-distance" && driveType === "full-hybrid") reasons.push("Hybride rijden vraagt bij lange afstanden geen vaste laadplanning.");
  if (answers.usage === "mixed") reasons.push("Deze aandrijflijn is inzetbaar voor het door u gekozen gemengde gebruik.");
  if (answers.annualKm === "over-30000" && driveType === "electric" && (answers.charging === "home" || answers.charging === "work")) {
    reasons.push("Uw hoge jaarkilometrage en vaste laadmogelijkheid maken elektrisch rijden het vergelijken waard.");
  }
  if (answers.charging === "none" && (driveType === "electric" || driveType === "plug-in-hybrid")) cautions.push("U gaf aan geen laadmogelijkheid te hebben. Bespreek daarom vooraf waar en hoe u kunt laden.");
  if (answers.charging === "public" && (driveType === "electric" || driveType === "plug-in-hybrid")) cautions.push("Controleer of openbaar laden op uw vaste routes praktisch en betaalbaar is.");
  if (answers.usage === "long-distance" && driveType === "electric") cautions.push("Bij lange afstanden blijven bereik, laadvermogen en beschikbare laadstops bepalend.");
  if (driveType === "electric" && vehicle.wltpRangeKm === undefined && vehicle.realisticRangeKm === undefined && vehicle.electricRangeKm === undefined) {
    cautions.push("Voor deze auto is geen bereikwaarde in de huidige openbare data beschikbaar.");
  }
  return { reasons: reasons.slice(0, 3), cautions };
}

export function matchVehicles(vehicles: Vehicle[], answers: VehicleFinderAnswers, limit = 3): VehicleFinderMatch[] {
  return vehicles
    .filter(vehicle => vehicle.status === "available" && isSupportedDriveType(vehicle.driveType))
    .filter(vehicle => matchesBudget(vehicle.priceCents, answers.budget) && preferenceMatches(vehicle.driveType, answers.preference))
    .map(vehicle => {
      const driveType = vehicle.driveType as Exclude<DriveType, "combustion">;
      const details = explanation(vehicle, answers);
      return {
        vehicle,
        score: (answers.preference === "advise" ? 0 : 5) + (answers.budget === "any" ? 0 : 4)
          + scoreCharging(driveType, answers.charging)
          + scoreUsage(driveType, answers.usage, answers.charging)
          + scoreAnnualKm(driveType, answers.annualKm, answers.charging),
        ...details,
      };
    })
    .sort((left, right) => right.score - left.score || left.vehicle.priceCents - right.vehicle.priceCents || left.vehicle.id.localeCompare(right.vehicle.id))
    .slice(0, limit);
}

