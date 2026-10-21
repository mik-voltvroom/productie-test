"use client";
import { useEffect, useState, use } from "react";
import { VehicleForm } from "@/components/dashboard/VehicleForm";
import { getVehicle } from "@/lib/repositories/vehicle-repository";
import type { Vehicle } from "@/types";
export default function EditVehiclePage({ params }: { params: Promise<{id:string}> }) {
  const { id } = use(params);
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getVehicle(id)
      .then(result => { if (active) setVehicle(result ?? null); })
      .catch(loadError => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Voertuig laden mislukt.");
        setVehicle(null);
      });
    return () => { active = false; };
  }, [id]);

  if (vehicle === undefined) return <main className="container dashboardPage">Laden…</main>;
  if (!vehicle) return <main className="container dashboardPage"><h1>{error ?? "Auto niet gevonden"}</h1></main>;
  return <main className="container dashboardPage"><VehicleForm initial={vehicle}/></main>;
}
