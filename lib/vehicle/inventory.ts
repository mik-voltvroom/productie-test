import type { Vehicle, VehicleStatus } from "@/types";

export type InventoryFilter = VehicleStatus | "all" | "active";

/** A provider deletion hides stock even while a linked deal keeps its own status. */
export function isActiveInventory(vehicle: Vehicle): boolean {
  return !["sold", "archived"].includes(vehicle.status)
    && !["sold", "archived"].includes(vehicle.source?.inventoryStatus ?? "");
}

export function matchesInventoryFilter(vehicle: Vehicle, filter: InventoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "archived") return vehicle.status === "archived" || vehicle.source?.inventoryStatus === "archived";
  if (filter === "sold") return vehicle.status === "sold" || vehicle.source?.inventoryStatus === "sold";
  return isActiveInventory(vehicle) && (filter === "active" || vehicle.status === filter);
}
