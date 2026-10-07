import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { InventoryBrowser } from "@/components/InventoryBrowser";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import styles from "./voorraad.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alle occasions | Volt & Vroom Groningen",
  description: "Bekijk alle hybride, elektrische en bijzondere occasions van Volt & Vroom in Groningen. Filter op merk, model, aandrijving, bouwjaar, prijs en categorie.",
  alternates: { canonical: "/voorraad" },
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ collectie?: string }> }) {
  const { collectie } = await searchParams;
  const vehicles = await listPublicVehicles(100);
  return <div className={styles.page}>
    <Header />
    <main className={styles.main}>
      <header className={styles.intro}>
        <span>Volledige voorraad</span>
        <h1>Ons <em>aanbod.</em><br />Eén helder overzicht.</h1>
        <p>Bekijk alle hybride, elektrische en bijzondere auto’s van Volt &amp; Vroom. Filter op de eigenschappen die voor u belangrijk zijn.</p>
      </header>
      <InventoryBrowser vehicles={vehicles} initialCategory={collectie === "icons" ? "icons" : "all"} />
    </main>
  </div>;
}
