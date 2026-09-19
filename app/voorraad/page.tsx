import Link from "next/link";
import { Header } from "@/components/Header";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";
import { centsToEuros } from "@/lib/money";
import { isIconVehicle, isVvOfferVehicle } from "@/lib/vehicle/business";

const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("nl-NL");

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ collectie?: string }> }) {
  const { collectie } = await searchParams;
  const isIconsCollection = collectie === "icons";
  const allVehicles = await listPublicVehicles(100);
  const vehicles = allVehicles.filter(isIconsCollection ? isIconVehicle : isVvOfferVehicle);

  return <div style={{ minHeight: "100vh", background: "#f7f9fa", color: "#111820" }}>
    <Header />
    <main style={{ maxWidth: 1320, margin: "0 auto", padding: "72px 28px 96px" }}>
      <header style={{ maxWidth: 760, marginBottom: 52 }}>
        <p style={{ margin: "0 0 14px", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: isIconsCollection ? "#b86b46" : "#64717c" }}>{isIconsCollection ? "Volt & Vroom Icons" : "Volt & Vroom selectie"}</p>
        <h1 style={{ margin: 0, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: .98, letterSpacing: "-.055em", fontWeight: 650 }}>{isIconsCollection ? <>Auto’s met karakter.<br />Helder gepresenteerd.</> : <>Geselecteerde auto’s.<br />Helder gepresenteerd.</>}</h1>
        <p style={{ margin: "24px 0 0", maxWidth: 620, fontSize: 18, lineHeight: 1.65, color: "#64717c" }}>{isIconsCollection ? "Youngtimers, klassiekers in spe en bijzondere sportieve auto’s die aantoonbaar passen bij onze visie op historie, techniek en karakter." : "Actuele hybride, elektrische en bijzondere occasions. Bekijk per auto de bekende gegevens en onze belangrijkste controlepunten."}</p>
        {isIconsCollection ? <Link href="/icons" style={{ display: "inline-flex", marginTop: 22, color: "#111820", fontWeight: 750, textDecoration: "none", borderBottom: "1px solid #111820", paddingBottom: 4 }}>Lees onze Icons-visie →</Link> : null}
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, borderTop: "1px solid #dfe5e8", paddingTop: 18, marginBottom: 28 }}>
        <span style={{ color: "#64717c" }}>{vehicles.length} {vehicles.length === 1 ? "auto" : "auto’s"} beschikbaar</span>
        {isIconsCollection ? <Link href="/voorraad" style={{ fontSize: 13, color: "#64717c", textDecoration: "none" }}>Bekijk elektrisch en hybride →</Link> : <Link href="/voorraad?collectie=icons" style={{ fontSize: 13, color: "#64717c", textDecoration: "none" }}>Bekijk Icons →</Link>}
      </div>

      {vehicles.length === 0 ? <div style={{ background: "white", borderRadius: 18, padding: 48, border: "1px solid #e4e9ec" }}><h2 style={{ marginTop: 0 }}>{isIconsCollection ? "Nieuwe Icons-selectie onderweg." : "Nieuwe selectie onderweg."}</h2><p style={{ color: "#64717c", marginBottom: 0 }}>{isIconsCollection ? "Op dit moment staat er geen beschikbare benzine-, diesel- of LPG-auto online." : "Er staan momenteel geen beschikbare elektrische of hybride voertuigen gepubliceerd."}</p></div> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {vehicles.map(vehicle => <Link key={vehicle.id} href={`/voorraad/${encodeURIComponent(vehicle.slug)}`} style={{ textDecoration: "none", color: "inherit", background: "white", borderRadius: 18, overflow: "hidden", border: isIconsCollection ? "1px solid #e6c6b5" : "1px solid #e4e9ec", display: "block" }}>
          <div style={{ aspectRatio: "4 / 3", background: "#edf1f3", overflow: "hidden", position: "relative" }}>
            {vehicle.images[0] ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#8a969e" }}>Foto volgt</div>}
            {isIconsCollection ? <span style={{ position: "absolute", left: 18, top: 18, padding: "8px 11px", borderRadius: 999, background: "rgba(255,255,255,.92)", color: "#9b5837", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 800 }}>Icons</span> : null}
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}><div><h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>{vehicle.brand} {vehicle.model}</h2><p style={{ margin: "6px 0 0", color: "#64717c", minHeight: 22 }}>{vehicle.trim}</p></div><strong style={{ fontSize: 20, whiteSpace: "nowrap" }}>{vehicle.priceCents > 0 ? money.format(centsToEuros(vehicle.priceCents)) : "Prijs op aanvraag"}</strong></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 22, paddingTop: 18, borderTop: "1px solid #edf0f2", color: "#52606b", fontSize: 14 }}>
              {vehicle.year ? <span>{vehicle.year}</span> : null}{vehicle.mileageKm !== undefined ? <span>{number.format(vehicle.mileageKm)} km</span> : null}{vehicle.transmission ? <span>{vehicle.transmission}</span> : null}{vehicle.fuelType ? <span>{vehicle.fuelType}</span> : null}
            </div>
            <span style={{ display: "inline-flex", marginTop: 22, minHeight: 44, alignItems: "center", color: "#0879dc", fontWeight: 750 }}>Bekijk auto →</span>
          </div>
        </Link>)}
      </div>}
    </main>
  </div>;
}
