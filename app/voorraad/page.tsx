import { publicPageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { InventoryBrowser } from "@/components/InventoryBrowser";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import styles from "./voorraad.module.css";
import {alertConfig} from "@/lib/stock-alerts/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata({
  title: "Alle occasions | Volt & Vroom Groningen",
  description: "Bekijk alle hybride, elektrische en bijzondere occasions van Volt & Vroom in Groningen. Filter op merk, model, aandrijving, bouwjaar, prijs en categorie.",
  alternates: { canonical: "/voorraad" },
});

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ collectie?: string }> }) {
  const { collectie } = await searchParams;
  const vehicles = await listPublicVehicles();
  const alerts=alertConfig();
  return <div className={styles.page}>
    <Header />
    <main className={styles.main}>
      <header className={styles.intro}>
        <span>Volledige voorraad</span>
        <h1>Ons <em>aanbod.</em><br />Eén helder overzicht.</h1>
        <p>Filter het aanbod op uw wensen en bekijk per auto wat bekend is over historie, techniek en dagelijks gebruik.</p>
      </header>
      <InventoryBrowser vehicles={vehicles} initialCategory={collectie === "icons" ? "icons" : "all"} stockAlertsEnabled={alerts.flags.signups||alerts.preview} stockAlertsAvailable={alerts.signupsAvailable}/>
    </main>
  </div>;
}
