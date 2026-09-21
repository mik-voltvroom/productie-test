"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import styles from "@/app/inruilen/inruilen.module.css";

type VehicleLookup = {
  licensePlate: string;
  brand: string;
  model: string;
  year?: number;
  vehicleType?: string;
  color?: string;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function TradeInForm({
  selectedVehicle,
}: {
  selectedVehicle?: { id: string; label: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [licensePlate, setLicensePlate] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "manual">("idle");
  const [vehicle, setVehicle] = useState<VehicleLookup | null>(null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [condition, setCondition] = useState("");
  const [maintenanceHistory, setMaintenanceHistory] = useState("");
  const [keys, setKeys] = useState("");
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");

  const normalizedPlate = licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, "");

  async function lookupVehicle() {
    setFeedback("");
    if (!/^[A-Z0-9]{6,8}$/.test(normalizedPlate)) {
      setFeedback("Vul een geldig Nederlands kenteken in.");
      return;
    }
    const mileage = Number(mileageKm);
    if (!Number.isInteger(mileage) || mileage < 0 || mileage > 2_000_000) {
      setFeedback("Vul een geldige kilometerstand in.");
      return;
    }

    setLookupState("loading");
    const response = await fetch("/api/trade-ins/lookup?kenteken=" + encodeURIComponent(normalizedPlate)).catch(() => null);
    const payload = await response?.json().catch(() => null);

    if (response?.ok && payload?.vehicle) {
      const found = payload.vehicle as VehicleLookup;
      setVehicle(found);
      setBrand(found.brand);
      setModel(found.model);
      setYear(found.year ? String(found.year) : "");
      setLookupState("found");
      setFeedback("");
      return;
    }

    setVehicle(null);
    setLookupState("manual");
    setFeedback(payload?.error || "Kentekencontrole lukt nu niet. Vul de voertuiggegevens handmatig in.");
  }

  function continueFromVehicle() {
    if (lookupState === "idle" || lookupState === "loading") {
      setFeedback("Haal eerst de voertuiggegevens op.");
      return;
    }
    if (!brand.trim() || !model.trim()) {
      setFeedback("Vul merk en model in.");
      return;
    }
    setFeedback("");
    setStep(2);
  }

  function continueFromCondition() {
    if (!condition || !maintenanceHistory || !keys) {
      setFeedback("Kies de staat, onderhoudshistorie en het aantal sleutels.");
      return;
    }
    setFeedback("");
    setStep(3);
  }

  function validatePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length > 6) {
      event.target.value = "";
      setPhotoNames([]);
      setFeedback("Voeg maximaal zes foto’s toe.");
      return;
    }
    if (files.some(file => file.size > 4 * 1024 * 1024)) {
      event.target.value = "";
      setPhotoNames([]);
      setFeedback("Een foto mag maximaal 4 MB groot zijn.");
      return;
    }
    if (files.reduce((total, file) => total + file.size, 0) > 20 * 1024 * 1024) {
      event.target.value = "";
      setPhotoNames([]);
      setFeedback("De foto’s mogen samen maximaal 20 MB groot zijn.");
      return;
    }
    setPhotoNames(files.map(file => file.name));
    setFeedback("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (!event.currentTarget.reportValidity()) return;

    setFormState("submitting");
    const response = await fetch("/api/trade-ins", {
      method: "POST",
      body: new FormData(event.currentTarget),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);

    if (response?.ok) {
      setFormState("success");
      setFeedback("Uw inruilaanvraag is ontvangen. Mik neemt persoonlijk contact met u op.");
      window.dispatchEvent(new CustomEvent("vv:lead-submitted", { detail: { form: "trade-in" } }));
      return;
    }

    setFormState("error");
    setFeedback(payload?.error || "Versturen lukt nu niet. Bel 0611669111 of mail naar sales@voltvroom.nl.");
  }

  if (formState === "success") {
    return <section className={styles.success} aria-live="polite">
      <span className={styles.successMark}>✓</span>
      <p className="eyebrow">Aanvraag ontvangen</p>
      <h2>Dank u. Mik bekijkt uw auto persoonlijk.</h2>
      <p>{feedback}</p>
      <a className="button" href="/voorraad">Bekijk de actuele voorraad</a>
    </section>;
  }

  return <form ref={formRef} className={styles.form} onSubmit={submit} data-mobile-action-anchor noValidate>
    <ol className={styles.progress} aria-label="Voortgang inruilaanvraag">
      {["Uw auto", "Staat", "Contact"].map((label, index) => {
        const number = index + 1;
        return <li className={number === step ? styles.current : number < step ? styles.complete : ""} key={label}>
          <span>{number < step ? "✓" : number}</span>{label}
        </li>;
      })}
    </ol>
    <style>{`.${styles.progress} li::after { display: none; }`}</style>

    <section className={styles.step} hidden={step !== 1}>
      <div className={styles.stepHeading}><span>Stap 1 van 3</span><h2>Welke auto wilt u inruilen?</h2><p>Vul het kenteken en de actuele kilometerstand in. We halen de openbare voertuiggegevens op bij RDW.</p></div>
      <div className={styles.lookupGrid}>
        <label>Kenteken
          <input className={styles.licensePlate} name="licensePlate" value={licensePlate} onChange={event => { setLicensePlate(event.target.value.toUpperCase()); setLookupState("idle"); }} placeholder="12-AB-34" autoComplete="off" inputMode="text" />
        </label>
        <label>Kilometerstand
          <div className={styles.suffixedInput}><input name="mileageKm" value={mileageKm} onChange={event => setMileageKm(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="85000" /><span>km</span></div>
        </label>
      </div>
      <button className={styles.lookupButton} type="button" onClick={lookupVehicle} disabled={lookupState === "loading"}>
        {lookupState === "loading" ? "Gegevens ophalen…" : "Haal voertuiggegevens op"}
      </button>

      {lookupState === "found" && vehicle ? <div className={styles.vehicleResult}>
        <div><span>Gevonden bij RDW</span><strong>{vehicle.brand} {vehicle.model}</strong><p>{[vehicle.year, vehicle.color, vehicle.vehicleType].filter(Boolean).join(" · ")}</p></div>
        <span className={styles.plate}>{normalizedPlate}</span>
      </div> : null}

      {lookupState === "manual" ? <div className={styles.manualFields}>
        <p><strong>Handmatig aanvullen</strong><br />U kunt gewoon doorgaan wanneer RDW tijdelijk niet bereikbaar is.</p>
        <div className={styles.threeColumns}>
          <label>Merk<input name="brand" value={brand} onChange={event => setBrand(event.target.value)} maxLength={80} /></label>
          <label>Model<input name="model" value={model} onChange={event => setModel(event.target.value)} maxLength={120} /></label>
          <label>Bouwjaar<input name="year" value={year} onChange={event => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" /></label>
        </div>
      </div> : null}

      {lookupState === "found" ? <>
        <input type="hidden" name="brand" value={brand} />
        <input type="hidden" name="model" value={model} />
        <input type="hidden" name="year" value={year} />
      </> : null}

      <div className={styles.stepActions}><button className="button" type="button" onClick={continueFromVehicle}>Dit is mijn auto <span aria-hidden="true">→</span></button></div>
    </section>

    <section className={styles.step} hidden={step !== 2}>
      <div className={styles.stepHeading}><span>Stap 2 van 3</span><h2>Wat moeten we over de auto weten?</h2><p>Een eerlijke omschrijving helpt ons om sneller een passende indicatie te geven.</p></div>

      <fieldset className={styles.choiceGroup}><legend>Algemene staat</legend><div className={styles.choiceCards}>
        {[["excellent", "Uitstekend", "Zeer netjes, zonder noemenswaardige gebruikssporen"], ["good", "Goed", "Normale, lichte gebruikssporen"], ["used", "Gebruikt", "Duidelijke gebruikssporen of onderhoud nodig"], ["damage", "Schade", "Schade of technische bijzonderheden aanwezig"]].map(([value, title, text]) =>
          <label className={condition === value ? styles.selectedChoice : ""} key={value}><input type="radio" name="condition" value={value} checked={condition === value} onChange={() => setCondition(value)} /><strong>{title}</strong><span>{text}</span></label>
        )}
      </div></fieldset>

      <div className={styles.twoColumns}>
        <label>Onderhoudshistorie<select name="maintenanceHistory" value={maintenanceHistory} onChange={event => setMaintenanceHistory(event.target.value)}><option value="">Maak een keuze</option><option value="complete">Compleet</option><option value="partial">Gedeeltelijk</option><option value="unknown">Onbekend</option></select></label>
        <label>Aantal sleutels<select name="keys" value={keys} onChange={event => setKeys(event.target.value)}><option value="">Maak een keuze</option><option value="one">1 sleutel</option><option value="two">2 sleutels</option><option value="more">Meer dan 2</option></select></label>
      </div>

      {condition === "damage" ? <label>Schade of technische bijzonderheden<textarea name="damage" rows={3} maxLength={1000} placeholder="Beschrijf kort wat er zichtbaar of bekend is." /></label> : <input type="hidden" name="damage" value="" />}
      <label>Belangrijke opties of uitvoering<textarea name="options" rows={3} maxLength={1000} placeholder="Bijvoorbeeld: trekhaak, panoramadak, warmtepomp of sportpakket." /></label>

      <label className={styles.upload}>
        <span><strong>Foto’s toevoegen</strong><small>Maximaal 6 foto’s · JPG, PNG, WebP of HEIC · maximaal 4 MB per foto</small></span>
        <input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={validatePhotos} />
      </label>
      {photoNames.length ? <p className={styles.fileSummary}>{photoNames.length} foto{photoNames.length === 1 ? "" : "’s"} geselecteerd: {photoNames.join(", ")}</p> : null}

      <div className={styles.stepActions}><button className={styles.backButton} type="button" onClick={() => { setFeedback(""); setStep(1); }}>← Terug</button><button className="button" type="button" onClick={continueFromCondition}>Verder <span aria-hidden="true">→</span></button></div>
    </section>

    <section className={styles.step} hidden={step !== 3}>
      <div className={styles.stepHeading}><span>Stap 3 van 3</span><h2>Waar mogen we de indicatie naartoe sturen?</h2><p>U ontvangt een persoonlijke indicatie. De definitieve waarde bepalen we na controle van de auto en gegevens.</p></div>

      <div className={styles.summary}>
        <div><span>Uw auto</span><strong>{brand} {model}</strong><small>{normalizedPlate} · {Number(mileageKm || 0).toLocaleString("nl-NL")} km</small></div>
        {selectedVehicle ? <div><span>Gewenste auto</span><strong>{selectedVehicle.label}</strong></div> : <div><span>Gewenste auto</span><strong>Nog niet gekozen</strong></div>}
      </div>

      <input type="hidden" name="desiredVehicleId" value={selectedVehicle?.id || ""} />
      <input type="hidden" name="desiredVehicleLabel" value={selectedVehicle?.label || ""} />

      <div className={styles.twoColumns}>
        <label>Naam <span className="fieldHint">verplicht</span><input name="name" autoComplete="name" minLength={2} required /></label>
        <label>Telefoon <span className="fieldHint">optioneel</span><input name="phone" type="tel" autoComplete="tel" minLength={8} /></label>
        <label>E-mailadres <span className="fieldHint">optioneel</span><input name="email" type="email" autoComplete="email" /></label>
        <label>Voorkeur contact<select name="contactPreference" defaultValue="phone"><option value="phone">Bel mij</option><option value="whatsapp">WhatsApp mij</option><option value="email">E-mail mij</option></select></label>
      </div>

      <div className="formHoneypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className={styles.consent}><input name="consent" type="checkbox" required /><span>Ik ga ermee akkoord dat Volt &amp; Vroom mijn gegevens en foto’s gebruikt om deze inruilaanvraag te beoordelen. Lees het <a href="/privacy">privacybeleid</a>.</span></label>
      <p className={styles.valueNotice}><strong>Geen automatisch bod.</strong> U ontvangt een onderbouwde indicatie. Staat, onderhoud, uitvoering en fysieke controle kunnen de definitieve waarde beïnvloeden.</p>

      <div className={styles.stepActions}><button className={styles.backButton} type="button" onClick={() => { setFeedback(""); setStep(2); }}>← Terug</button><button className="button" type="submit" disabled={formState === "submitting"}>{formState === "submitting" ? "Veilig versturen…" : "Ontvang mijn inruilindicatie"}</button></div>
    </section>

    <p className={styles.feedback + (formState === "error" ? " " + styles.error : "")} aria-live="polite">{feedback}</p>
  </form>;
}
