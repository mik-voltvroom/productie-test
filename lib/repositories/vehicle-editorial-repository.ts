import type { ApiActor } from "@/lib/auth/api";
import { EditorialConflict, type EditorialCommand } from "@/lib/vehicle/editorial";
import type { Vehicle } from "@/types";

/** Kept as an explicit rejection for older dashboard clients. No database writes. */
export async function updateVehicleEditorial(_id: string, _command: EditorialCommand, _actor: ApiActor): Promise<Vehicle> {
  throw new EditorialConflict("Openbare voertuiggegevens worden uitsluitend in Mobilox beheerd.");
}
