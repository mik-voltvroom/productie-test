"use client";
import type { Vehicle } from "@/types";
import { integrationMode } from "@/lib/config";
import { getVehicles, upsertVehicle as demoUpsert } from "@/lib/demo-store";
import { type EditorialCommand } from "@/lib/vehicle/editorial";
import { applyInternalVehicleUpdate } from "@/lib/vehicle/internal";

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

export async function saveVehicle(vehicle: Vehicle, expectedUpdatedAt?: string): Promise<Vehicle> {
  if (!expectedUpdatedAt) throw new Error("Nieuwe voertuigen worden uitsluitend in Mobilox aangemaakt.");
  const commercial = vehicle.commercial;
  if (!commercial || !vehicle.costs) throw new Error("Interne voertuiggegevens ontbreken.");
  const body = { expectedUpdatedAt, costs: vehicle.costs, commercial: {
    acquisitionSource: commercial.acquisitionSource, acquiredAt: commercial.acquiredAt ?? null,
    stockEnteredAt: commercial.stockEnteredAt ?? null, targetMarginCents: commercial.targetMarginCents,
    maxStockDays: commercial.maxStockDays, viewCount: commercial.viewCount, leadCount: commercial.leadCount,
  } };
  if (integrationMode !== "firebase") {
    const current = getVehicles().find(item => item.id === vehicle.id);
    if (!current) throw new Error("Voertuig niet gevonden.");
    const next = applyInternalVehicleUpdate(current, body, new Date().toISOString());
    demoUpsert(next); return next;
  }
  const response = await fetch(`/api/vvos/vehicles/${encodeURIComponent(vehicle.id)}/internal`, {
    method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error ?? "Opslaan mislukt.");
  return result.vehicle as Vehicle;
}

export async function saveVehicleEditorial(vehicle: Vehicle, command: EditorialCommand): Promise<Vehicle> {
  throw new Error("Openbare voertuiggegevens worden uitsluitend in Mobilox beheerd.");
}

export async function removeVehicle(_id: string): Promise<void> {
  throw new Error("Verwijder het voertuig in Mobilox.");
}
