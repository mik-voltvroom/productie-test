import { getPublicVehicleImages } from "@/lib/vehicle/photos";
import type { Vehicle } from "@/types";

export function isPublishedOnWebsite(vehicle: Vehicle): boolean {
  return vehicle.status === "available"
    && (vehicle.source?.inventoryStatus === undefined || vehicle.source.inventoryStatus === "available")
    && vehicle.publication?.channels.website === true
    && (vehicle.publication.validationErrors?.length ?? 0) === 0
    && getPublicVehicleImages(vehicle).length > 0;
}

export function isPublishedToMerchant(vehicle: Vehicle): boolean {
  return isPublishedOnWebsite(vehicle)
    && vehicle.publication?.channels.merchant === true;
}
