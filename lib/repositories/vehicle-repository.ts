"use client";
import type { Vehicle } from "@/types";
import { db } from "@/lib/firebase-client";
import { integrationMode } from "@/lib/config";
import { getVehicles, upsertVehicle as demoUpsert, deleteVehicle as demoDelete } from "@/lib/demo-store";
import { deleteDoc, deleteField, doc, runTransaction } from "firebase/firestore";
import { applyEditorialCommand, type EditorialCommand } from "@/lib/vehicle/editorial";
import { removeUndefinedValues } from "@/lib/firestore-data";

interface VehicleListResponse {
  ok: boolean;
  vehicles?: Vehicle[];
  error?: string;
}

export async function listVehicles(): Promise<Vehicle[]> {
  if (integrationMode !== "firebase") return getVehicles();

  const response = await fetch("/api/vvos/vehicles", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  const payload = await response.json() as VehicleListResponse;
  if (!response.ok || !payload.ok || !Array.isArray(payload.vehicles)) {
    throw new Error(payload.error || `Voorraad laden mislukt (${response.status}).`);
  }
  return payload.vehicles;
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  if (integrationMode !== "firebase") return getVehicles().find(vehicle => vehicle.id === id);
  return (await listVehicles()).find(vehicle => vehicle.id === id);
}

export async function saveVehicle(vehicle: Vehicle, expectedUpdatedAt?: string): Promise<void> {
  if (integrationMode !== "firebase") return demoUpsert(vehicle);
  if (!db) throw new Error("VVOS database niet beschikbaar. Er is niets opgeslagen.");
  const legacyTopLevelDeletes = {
    priceEur: deleteField(),
    monthlyPriceEur: deleteField(),
    annualSavingEur: deleteField(),
  };
  const legacyCostDeletes = vehicle.costs ? {
    purchasePriceEur: deleteField(),
    transportEur: deleteField(),
    preparationEur: deleteField(),
    maintenanceEur: deleteField(),
    warrantyReserveEur: deleteField(),
    advertisingEur: deleteField(),
    financingEur: deleteField(),
    otherEur: deleteField(),
  } : {};
  const clearedShowroomValueDeletes = {
    ...(vehicle.wltpRangeKm === undefined ? { wltpRangeKm: deleteField() } : {}),
    ...(vehicle.realisticRangeKm === undefined ? { realisticRangeKm: deleteField() } : {}),
    ...(vehicle.roadTax === undefined ? { roadTax: deleteField() } : {}),
  };
  await runTransaction(db, async transaction => {
    const ref = doc(db!, "vehicles", vehicle.id);
    const current = await transaction.get(ref);
    if (current.exists() && current.data().updatedAt !== expectedUpdatedAt) throw new Error("Het voertuig is tussentijds gewijzigd. Herlaad voordat je opslaat.");
    transaction.set(ref, removeUndefinedValues({
      ...vehicle,
      ...legacyTopLevelDeletes,
      ...clearedShowroomValueDeletes,
      ...(vehicle.costs ? { costs: { ...vehicle.costs, ...legacyCostDeletes } } : {}),
    }), { merge: true });
  });
}

export async function saveVehicleEditorial(vehicle: Vehicle, command: EditorialCommand): Promise<Vehicle> {
  if (integrationMode !== "firebase") {
    const current = getVehicles().find(item => item.id === vehicle.id) ?? vehicle;
    const next = applyEditorialCommand(current, command, new Date().toISOString());
    demoUpsert(next);
    return next;
  }
  const response = await fetch(`/api/vvos/vehicles/${encodeURIComponent(vehicle.id)}/editorial`, {
    method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(command),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error ?? "Opslaan mislukt.");
  return result.vehicle;
}

export async function removeVehicle(id: string): Promise<void> {
  if (integrationMode !== "firebase" || !db) return demoDelete(id);
  await deleteDoc(doc(db, "vehicles", id));
}
