"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ShowroomCard } from "@/components/dashboard/ShowroomCard";
import styles from "@/components/dashboard/ShowroomCard.module.css";
import { getVehicle } from "@/lib/repositories/vehicle-repository";
import type { Vehicle } from "@/types";

export default function ShowroomCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("showroomCardPrintMode");
    return () => document.body.classList.remove("showroomCardPrintMode");
  }, []);

  useEffect(() => {
    let active = true;
    void getVehicle(id)
      .then(result => { if (active) setVehicle(result ?? null); })
      .catch(loadError => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Showroomkaart laden mislukt.");
        setVehicle(null);
      });
    return () => { active = false; };
  }, [id]);

  if (vehicle === undefined) return <main className={styles.page}>Showroomkaart laden…</main>;
  if (!vehicle) return <main className={styles.page}><h1>{error || "Auto niet gevonden"}</h1></main>;

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <p>A4-portret · kies bij afdrukken schaal 100% en achtergrondafbeeldingen aan.</p>
        <div>
          <Link className="button secondary" href={`/dashboard/voorraad/${encodeURIComponent(vehicle.id)}`}>Terug</Link>
          <button className="button" type="button" onClick={() => window.print()}>Print A4</button>
        </div>
      </div>
      <ShowroomCard vehicle={vehicle} />
    </main>
  );
}
