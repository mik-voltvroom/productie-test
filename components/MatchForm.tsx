"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { vehicleContactHref } from "@/lib/contact/links";
import type { VehicleFinderAnswers } from "@/lib/vehicle-finder/business";

type FinderState = "questions" | "loading" | "results" | "error";
type LeadState = "idle" | "submitting" | "success" | "error";
type AnswerKey = keyof VehicleFinderAnswers;

type FinderResult = {
  id: string;
  slug: string;
  imageUrl: string | null;
  brand: string;
  model: string;
  trim: string;
  priceCents: number;
  year: number;
  mileageKm: number;
  driveType: "electric" | "plug-in-hybrid" | "full-hybrid";
  transmission: string;
  wltpRangeKm?: number;
  realisticRangeKm?: number;
  electricRangeKm?: number;
  batteryHealthPercent?: number;
  reasons: string[];
  cautions: string[];
};

const steps: Array<{
  key: AnswerKey;
  title: string;
  options: Array<{ value: string; label: string }>;
}> = [
  { key: "budget", title: "Wat is uw budget?", options: [
    { value: "up-to-20000", label: "Tot €20.000" },
    { value: "20000-30000", label: "€20.000–€30.000" },
    { value: "30000-45000", label: "€30.000–€45.000" },
    { value: "45000-plus", label: "€45.000+" },
    { value: "any", label: "Geen voorkeur" },
  ] },
  { key: "annualKm", title: "Hoeveel rijdt u per jaar?", options: [
    { value: "under-10000", label: "Minder dan 10.000 km" },
    { value: "10000-20000", label: "10.000–20.000 km" },
    { value: "20000-30000", label: "20.000–30.000 km" },
    { value: "over-30000", label: "Meer dan 30.000 km" },
  ] },
  { key: "charging", title: "Waar kunt u doorgaans laden?", options: [
    { value: "home", label: "Thuis laden" },
    { value: "work", label: "Werk" },
    { value: "public", label: "Openbaar laden" },
    { value: "none", label: "Geen laadmogelijkheid" },
  ] },
  { key: "usage", title: "Waarvoor gebruikt u de auto vooral?", options: [
    { value: "city", label: "Stad" },
    { value: "commute", label: "Woon-werk" },
    { value: "long-distance", label: "Lange afstanden" },
    { value: "mixed", label: "Gemengd gebruik" },
  ] },
  { key: "preference", title: "Welke aandrijflijn heeft uw voorkeur?", options: [
    { value: "electric", label: "Volledig elektrisch" },
    { value: "plug-in-hybrid", label: "Plug-in hybride" },
    { value: "full-hybrid", label: "Hybride" },
    { value: "advise", label: "Adviseer mij" },
  ] },
];

const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("nl-NL");
const driveLabels = { electric: "Elektrisch", "plug-in-hybrid": "Plug-in hybride", "full-hybrid": "Hybride" } as const;

function answerLabel(key: AnswerKey, value: string) {
  return steps.find(step => step.key === key)?.options.find(option => option.value === value)?.label ?? value;
}

function profileMessage(answers: VehicleFinderAnswers) {
  return [
    "Zoekverzoek via de voertuigkeuzehulp.",
    `Budget: ${answerLabel("budget", answers.budget)}.`,
    `Jaarlijkse kilometers: ${answerLabel("annualKm", answers.annualKm)}.`,
    `Laden: ${answerLabel("charging", answers.charging)}.`,
    `Gebruik: ${answerLabel("usage", answers.usage)}.`,
    `Voorkeur: ${answerLabel("preference", answers.preference)}.`,
  ].join(" ");
}

function SearchRequestForm({ answers }: { answers: VehicleFinderAnswers }) {
  const [state, setState] = useState<LeadState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    if (!email && !phone) {
      setState("error");
      setMessage("Vul een telefoonnummer of e-mailadres in zodat we u kunnen bereiken.");
      return;
    }

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        email: email || undefined,
        phone: phone || undefined,
        channel: "website",
        interest: "Adviesgesprek",
        message: profileMessage(answers),
        consent: form.get("consent") === "on",
        website: String(form.get("website") || ""),
      }),
    }).catch(() => null);

    const body = await response?.json().catch(() => null) as { error?: string } | null;
    if (!response?.ok) {
      setState("error");
      setMessage(body?.error || "Verzenden lukt nu niet. Probeer het later opnieuw.");
      return;
    }

    setState("success");
    setMessage("Uw zoekverzoek is ontvangen. We nemen persoonlijk contact met u op.");
    window.dispatchEvent(new CustomEvent("vv:lead-submitted", { detail: { form: "vehicle_finder_search_request" } }));
  }

  return <section className="finderLead" aria-labelledby="finder-lead-title">
    <div><p className="eyebrow">Verder zoeken</p><h2 id="finder-lead-title">Nog niet de juiste auto gevonden?</h2><p>Laat uw zoekprofiel achter. Persoonsgegevens vragen we pas nu, omdat ze nodig zijn om u persoonlijk te helpen.</p></div>
    {state === "success" ? <p className="finderLeadSuccess" role="status">{message}</p> : <form className="finderLeadForm" onSubmit={submit}>
      <label>Naam<input name="name" autoComplete="name" minLength={2} required /></label>
      <label>E-mailadres<input name="email" type="email" autoComplete="email" /></label>
      <label>Telefoon<input name="phone" type="tel" autoComplete="tel" minLength={8} /></label>
      <div className="formHoneypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="consent"><input name="consent" type="checkbox" required /><span>Ik ga ermee akkoord dat Volt &amp; Vroom mijn gegevens gebruikt om mijn zoekverzoek te beantwoorden. Lees het <a href="/privacy">privacybeleid</a>.</span></label>
      <button className="button" type="submit" disabled={state === "submitting"}>{state === "submitting" ? "Verzenden…" : "Laat zoekverzoek achter"}</button>
      {state === "error" && <p className="finderError" role="alert">{message}</p>}
    </form>}
  </section>;
}

export function MatchForm() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<VehicleFinderAnswers>>({});
  const [results, setResults] = useState<FinderResult[]>([]);
  const [state, setState] = useState<FinderState>("questions");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const currentStep = steps[stepIndex];
  const completeAnswers = useMemo(() => steps.every(step => Boolean(answers[step.key])), [answers]);

  function choose(value: string) {
    setAnswers(current => ({ ...current, [currentStep.key]: value }));
  }

  function moveTo(index: number) {
    setStepIndex(index);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("input")?.focus());
  }

  async function next() {
    if (!answers[currentStep.key]) return;
    if (stepIndex < steps.length - 1) {
      moveTo(stepIndex + 1);
      return;
    }
    if (!completeAnswers) return;

    setState("loading");
    setError("");
    const response = await fetch("/api/vehicle-finder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    }).catch(() => null);
    const body = await response?.json().catch(() => null) as { results?: FinderResult[]; error?: string } | null;
    if (!response?.ok || !body?.results) {
      setState("error");
      setError(body?.error || "De actuele voorraad kan nu niet worden geladen. Probeer het later opnieuw.");
      return;
    }
    setResults(body.results);
    setState("results");
  }

  function restart() {
    setAnswers({});
    setResults([]);
    setState("questions");
    setError("");
    moveTo(0);
  }

  if (state === "results") {
    const selected = answers as VehicleFinderAnswers;
    return <div className="matchForm finderResults" aria-live="polite">
      <div className="finderResultsHeader"><div><p className="eyebrow">Uw persoonlijke selectie</p><h2>{results.length ? `${results.length} passende ${results.length === 1 ? "auto" : "auto’s"} in de actuele voorraad` : "Geen passende auto in de actuele voorraad"}</h2><p>{results.length ? "De toelichting hieronder laat zien hoe ieder advies uit uw antwoorden volgt." : "We tonen geen fictieve alternatieven. Laat uw zoekprofiel achter, dan zoeken we gericht met u mee."}</p></div><button className="button secondary" type="button" onClick={restart}>Opnieuw beginnen</button></div>
      {results.length > 0 && <div className="finderResultGrid">{results.map(vehicle => <article className="finderVehicle" key={vehicle.id}>
        <Link className="finderVehicleMedia" href={`/voorraad/${encodeURIComponent(vehicle.slug)}`} data-vv-event="inventory_click" aria-label={`Bekijk ${vehicle.brand} ${vehicle.model}`}>
          {vehicle.imageUrl ? <img src={vehicle.imageUrl} alt={`${vehicle.brand} ${vehicle.model} ${vehicle.trim}`.trim()} loading="lazy" /> : <span>Foto volgt</span>}
        </Link>
        <div className="finderVehicleBody">
          <div className="finderVehicleHeading"><div><span>{driveLabels[vehicle.driveType]}</span><h3>{vehicle.brand} {vehicle.model}</h3><p>{vehicle.trim}</p></div><strong>{money.format(vehicle.priceCents / 100)}</strong></div>
          <ul className="finderFacts"><li>{vehicle.year}</li><li>{number.format(vehicle.mileageKm)} km</li><li>{vehicle.transmission}</li>{vehicle.wltpRangeKm !== undefined && <li>WLTP {number.format(vehicle.wltpRangeKm)} km</li>}{vehicle.realisticRangeKm !== undefined && <li>Praktijkbereik {number.format(vehicle.realisticRangeKm)} km</li>}{vehicle.electricRangeKm !== undefined && vehicle.wltpRangeKm === undefined && vehicle.realisticRangeKm === undefined && <li>Elektrisch bereik {number.format(vehicle.electricRangeKm)} km</li>}{vehicle.batteryHealthPercent !== undefined && <li>Accu {vehicle.batteryHealthPercent}%</li>}</ul>
          <div className="finderWhy"><strong>Waarom deze auto?</strong><ul>{vehicle.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>{vehicle.cautions.map(caution => <p key={caution}>{caution}</p>)}</div>
          <div className="finderVehicleActions"><Link className="button" href={`/voorraad/${encodeURIComponent(vehicle.slug)}`} data-vv-event="inventory_click">Bekijk deze auto</Link><Link className="button secondary" href={vehicleContactHref(vehicle.id, "vraag")}>Vraag persoonlijk advies</Link></div>
        </div>
      </article>)}</div>}
      <SearchRequestForm answers={selected} />
    </div>;
  }

  return <div className="matchForm" ref={formRef}>
    <div className="matchFormIntro"><span>Intelligente keuzehulp</span><strong>Stap {stepIndex + 1} van {steps.length}</strong></div>
    <ol className="matchProgress" aria-label="Voortgang keuzehulp">{steps.map((step, index) => <li key={step.key} className={index < stepIndex ? "complete" : index === stepIndex ? "active" : ""} aria-current={index === stepIndex ? "step" : undefined}><span>{index + 1}</span><small>{step.title}</small></li>)}</ol>
    <fieldset className="finderStep"><legend>{currentStep.title}</legend><div className="optionGrid finderOptions">{currentStep.options.map(option => <label key={option.value}><input type="radio" name={currentStep.key} value={option.value} checked={answers[currentStep.key] === option.value} onChange={() => choose(option.value)} /><span>{option.label}</span></label>)}</div></fieldset>
    {state === "error" && <p className="finderError" role="alert">{error}</p>}
    <div className="matchNavigation">{stepIndex > 0 ? <button className="button secondary" type="button" onClick={() => moveTo(stepIndex - 1)}>Vorige</button> : <span />}<button className="button" type="button" onClick={next} disabled={!answers[currentStep.key] || state === "loading"}>{state === "loading" ? "Actuele voorraad wordt geladen…" : stepIndex === steps.length - 1 ? "Toon passende auto’s" : "Volgende"}</button></div>
    <p className="finderPrivacy">We vragen pas om contactgegevens wanneer u persoonlijk advies of een zoekverzoek wilt.</p>
  </div>;
}
