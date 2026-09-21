import type { Vehicle, VehicleCosts } from "@/types";
import { getPublicVehicleImages, hasExplicitPublicImageSelection } from "@/lib/vehicle/photos";

export const emptyCosts: VehicleCosts = {
  purchasePriceCents: 0,
  transportCents: 0,
  preparationCents: 0,
  maintenanceCents: 0,
  warrantyReserveCents: 0,
  advertisingCents: 0,
  financingCents: 0,
  otherCents: 0,
};

export function totalCosts(costs: VehicleCosts): number {
  return Object.values(costs).reduce((total, value) => total + Number(value || 0), 0);
}

export function grossMargin(priceCents: number, costs: VehicleCosts): number {
  return Number(priceCents || 0) - totalCosts(costs);
}

export function marginPercent(priceCents: number, costs: VehicleCosts): number {
  if (!priceCents) return 0;
  return (grossMargin(priceCents, costs) / priceCents) * 100;
}

export function slugify(value: string): string {
  return value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function validateVehicle(vehicle: Partial<Vehicle>): string[] {
  const errors: string[] = [];
  if (!vehicle.brand) errors.push("Merk ontbreekt");
  if (!vehicle.model) errors.push("Model ontbreekt");
  if (!vehicle.trim) errors.push("Uitvoering ontbreekt");
  if (!vehicle.year) errors.push("Bouwjaar ontbreekt");
  if (!vehicle.mileageKm && vehicle.mileageKm !== 0) errors.push("Kilometerstand ontbreekt");
  if (!vehicle.priceCents) errors.push("Verkoopprijs ontbreekt");
  if (!vehicle.images?.length) errors.push("Minimaal één foto is verplicht");
  else if (hasExplicitPublicImageSelection(vehicle.publication) && getPublicVehicleImages(vehicle as Vehicle).length === 0) {
    errors.push("Selecteer minimaal één foto voor online publicatie");
  }
  if (!vehicle.locationCode) errors.push("Vestigingscode ontbreekt");
  if (vehicle.driveType !== "electric" && !vehicle.consumptionPer100Km) errors.push("Praktijkverbruik ontbreekt");
  if (["full-hybrid", "plug-in-hybrid"].includes(vehicle.driveType ?? "") && !vehicle.batteryHealthPercent) {
    errors.push("Accugezondheid ontbreekt");
  }
  return errors;
}
