"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { centsToEuros } from "@/lib/money";
import { vehiclePresentation } from "@/lib/vehicle/presentation";
import { VehicleHighlights } from "@/components/vehicles/VehicleHighlights";
import type { DriveType, Vehicle } from "@/types";
import styles from "@/app/voorraad/voorraad.module.css";

type Category = "all" | "hybrid" | "electric" | "icons";
const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("nl-NL");
const driveLabels: Record<DriveType, string> = { "full-hybrid": "Hybride", "plug-in-hybrid": "Plug-in hybride", electric: "Elektrisch", combustion: "Verbrandingsmotor" };
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "nl"));
const categoryFor = (vehicle: Vehicle): Exclude<Category, "all"> => vehicle.driveType === "electric" ? "electric" : vehicle.driveType === "combustion" ? "icons" : "hybrid";
const categoryChoices: Array<{ value: Exclude<Category, "all">; title: string; description: string; icon?: string }> = [
  { value: "hybrid", title: "Hybride", description: "Elektrisch ondersteund, vertrouwd op benzine.", icon: "/brand/icons/hybride.svg" },
  { value: "electric", title: "Elektrisch", description: "Volledig elektrisch, stil en direct.", icon: "/brand/icons/elektrisch.svg" },
  { value: "icons", title: "Icons", description: "Bijzondere auto’s met karakter." },
];

function QuickCategory({ active, value, children, onSelect }: { active: boolean; value: Category; children: ReactNode; onSelect: (value: Category) => void }) {
  return <button type="button" className={active ? styles.quickActive : undefined} aria-pressed={active} onClick={() => onSelect(value)}>{children}</button>;
}

export function InventoryBrowser({ vehicles, initialCategory = "all" }: { vehicles: Vehicle[]; initialCategory?: Category }) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [brand, setBrand] = useState(""); const [model, setModel] = useState(""); const [driveType, setDriveType] = useState("");
  const [fuelType, setFuelType] = useState(""); const [trim, setTrim] = useState(""); const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState(""); const [priceFrom, setPriceFrom] = useState(""); const [priceTo, setPriceTo] = useState("");
  const brands = useMemo(() => unique(vehicles.map(v => v.brand)), [vehicles]);
  const models = useMemo(() => unique(vehicles.filter(v => !brand || v.brand === brand).map(v => v.model)), [brand, vehicles]);
  const fuels = useMemo(() => unique(vehicles.map(v => v.fuelType)), [vehicles]); const trims = useMemo(() => unique(vehicles.map(v => vehiclePresentation(v.trim).edition)), [vehicles]);
  const years = useMemo(() => [...new Set(vehicles.map(v => v.year))].sort((a, b) => b - a), [vehicles]);
  const filtered = useMemo(() => vehicles.filter(vehicle => { const price = centsToEuros(vehicle.priceCents); return (category === "all" || categoryFor(vehicle) === category) && (!brand || vehicle.brand === brand) && (!model || vehicle.model === model) && (!driveType || vehicle.driveType === driveType) && (!fuelType || vehicle.fuelType === fuelType) && (!trim || vehiclePresentation(vehicle.trim).edition === trim) && (!yearFrom || vehicle.year >= Number(yearFrom)) && (!yearTo || vehicle.year <= Number(yearTo)) && (!priceFrom || price >= Number(priceFrom)) && (!priceTo || price <= Number(priceTo)); }), [brand, category, driveType, fuelType, model, priceFrom, priceTo, trim, vehicles, yearFrom, yearTo]);
  function selectCategory(next: Category) {
    resetFilters();
    setCategory(next);
    document.getElementById("aanbod-resultaten")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function resetFilters() { setCategory("all"); setBrand(""); setModel(""); setDriveType(""); setFuelType(""); setTrim(""); setYearFrom(""); setYearTo(""); setPriceFrom(""); setPriceTo(""); }
  return <>
    <div className={styles.categoryActions}><QuickCategory active={category === "all"} value="all" onSelect={selectCategory}>Volledig aanbod</QuickCategory></div>
    <nav className={styles.categoryChoices} aria-label="Snel naar een aanbodcategorie">
      {categoryChoices.map(choice => <button key={choice.value} type="button" className={`${styles.categoryChoice} ${styles[choice.value]} ${category === choice.value ? styles.categoryActive : ""}`} aria-pressed={category === choice.value} onClick={() => selectCategory(choice.value)}>
        {choice.icon ? <Image src={choice.icon} alt="" width={44} height={44} /> : <span className={styles.iconsMark} aria-hidden="true">&amp;</span>}
        <span><strong>{choice.title}</strong><small>{choice.description}</small></span>
      </button>)}
    </nav>
    <div className={styles.layout}>
      <aside className={styles.filters} aria-label="Filter het aanbod">
        <div className={styles.filterHeading}><div><span>Filter</span><h2>Vind uw auto</h2></div><button type="button" onClick={resetFilters}>Wis alles</button></div>
        <label>Merk<select value={brand} onChange={e => { setBrand(e.target.value); setModel(""); }}><option value="">Alle merken</option>{brands.map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Model<select value={model} onChange={e => setModel(e.target.value)}><option value="">Alle modellen</option>{models.map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Aandrijving<select value={driveType} onChange={e => setDriveType(e.target.value)}><option value="">Alle aandrijvingen</option>{Object.entries(driveLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
        <label>Brandstof<select value={fuelType} onChange={e => setFuelType(e.target.value)}><option value="">Alle brandstoffen</option>{fuels.map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Uitvoering<select value={trim} onChange={e => setTrim(e.target.value)}><option value="">Alle uitvoeringen</option>{trims.map(v => <option key={v}>{v}</option>)}</select></label>
        <fieldset><legend>Bouwjaar</legend><div className={styles.range}><select aria-label="Bouwjaar vanaf" value={yearFrom} onChange={e => setYearFrom(e.target.value)}><option value="">Vanaf</option>{years.map(v => <option key={v}>{v}</option>)}</select><select aria-label="Bouwjaar tot en met" value={yearTo} onChange={e => setYearTo(e.target.value)}><option value="">Tot</option>{years.map(v => <option key={v}>{v}</option>)}</select></div></fieldset>
        <fieldset><legend>Prijs</legend><div className={styles.range}><input type="number" min="0" step="500" placeholder="Vanaf €" aria-label="Prijs vanaf" value={priceFrom} onChange={e => setPriceFrom(e.target.value)} /><input type="number" min="0" step="500" placeholder="Tot €" aria-label="Prijs tot en met" value={priceTo} onChange={e => setPriceTo(e.target.value)} /></div></fieldset>
        <label>Categorie<select value={category} onChange={e => setCategory(e.target.value as Category)}><option value="all">Hele voorraad</option><option value="hybrid">Hybride</option><option value="electric">Elektrisch</option><option value="icons">Icons</option></select></label>
      </aside>
      <section id="aanbod-resultaten" className={styles.results} aria-live="polite"><div className={styles.resultHeading}><span>{filtered.length} {filtered.length === 1 ? "auto" : "auto’s"} gevonden</span><span>{category === "all" ? "Alle categorieën" : category === "hybrid" ? "Hybride" : category === "electric" ? "Elektrisch" : "Icons"}</span></div>
        {filtered.length === 0 ? <div className={styles.empty}><h2>Geen auto’s met deze filters.</h2><p>Pas één of meer filters aan om het volledige aanbod te bekijken.</p><button type="button" onClick={resetFilters}>Bekijk hele voorraad</button></div> : <div className={styles.grid}>{filtered.map(vehicle => <Link key={vehicle.id} href={`/voorraad/${encodeURIComponent(vehicle.slug)}`} className={styles.card}><div className={styles.media}>{vehicle.images[0] ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} /> : <div>Foto volgt</div>}<span className={categoryFor(vehicle) === "icons" ? styles.iconBadge : undefined}>{categoryFor(vehicle) === "icons" ? <><b aria-hidden="true">&amp;</b>Icons</> : <><Image src={vehicle.driveType === "electric" ? "/brand/icons/elektrisch.svg" : "/brand/icons/hybride.svg"} alt="" width={18} height={18} />{driveLabels[vehicle.driveType]}</>}</span></div><div className={styles.cardBody}><div className={styles.cardHeading}><div><h2>{vehicle.brand} {vehicle.model}</h2></div><strong>{vehicle.priceCents > 0 ? money.format(centsToEuros(vehicle.priceCents)) : "Prijs op aanvraag"}</strong><VehicleHighlights trim={vehicle.trim} compact className={styles.cardPresentation} /></div><div className={styles.meta}><span>{vehicle.year}</span><span>{number.format(vehicle.mileageKm)} km</span><span>{vehicle.transmission}</span><span>{vehicle.fuelType}</span></div><span className={styles.cardAction}>Bekijk auto <b aria-hidden="true">→</b></span></div></Link>)}</div>}
      </section>
    </div>
  </>;
}
