"use client";

import { FormEvent, useState } from "react";

type MatchState = "idle" | "submitting" | "success" | "error";

function getRecommendation(charging: string, dailyDistance: string, longTrips: string) {
  if (charging === "none") return { title: "Waarschijnlijk full hybrid", text: "Zonder structurele laadmogelijkheid is een full hybrid vaak de meest praktische geëlektrificeerde keuze." };
  if (charging === "home-or-work" && dailyDistance !== "150-plus") return { title: "Elektrisch lijkt kansrijk", text: "Uw laadmogelijkheid en dagelijkse afstand maken een volledig elektrische auto waarschijnlijk logisch." };
  if (charging === "sometimes" && longTrips === "often") return { title: "Vergelijk hybride en plug-inhybride", text: "Uw profiel vraagt om een vergelijking van laadgedrag, lange ritten en werkelijk brandstofverbruik." };
  return { title: "Elektrisch en plug-inhybride vergelijken", text: "Beide routes kunnen passen. De praktijkrange, laadroutine en totale kosten geven de doorslag." };
}

export function MatchForm() {
  const [state, setState] = useState<MatchState>("idle");
  const [result, setResult] = useState<{ title: string; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const charging = String(form.get("charging"));
    const dailyDistance = String(form.get("dailyDistance"));
    const longTrips = String(form.get("longTrips"));
    const recommendation = getRecommendation(charging, dailyDistance, longTrips);
    const budget = Number(form.get("budgetEur"));
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();

    if (!email && !phone) {
      setResult({ title: "Contactgegeven ontbreekt", text: "Vul een telefoonnummer of e-mailadres in zodat we uw profiel persoonlijk kunnen bespreken." });
      setState("error");
      return;
    }

    const profile = [
      `Hybrid & EV Match: ${recommendation.title}.`,
      `Jaarafstand: ${form.get("annualKm")}.`,
      `Dagafstand: ${dailyDistance}.`,
      `Laden: ${charging}.`,
      `Lange ritten: ${longTrips}.`,
      `Trekgewicht nodig: ${form.get("towing") === "yes" ? "ja" : "nee"}.`,
      `Voorkeur: ${form.get("preference")}.`,
    ].join(" ");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        email: email || undefined,
        phone: phone || undefined,
        channel: "website",
        message: profile,
        consent: form.get("consent") === "on",
        budgetEur: Number.isFinite(budget) && budget > 0 ? budget : undefined,
        hasTradeIn: form.get("tradeIn") === "yes",
        website: String(form.get("website") || ""),
      }),
    }).catch(() => null);

    setResult(recommendation);
    const success = Boolean(response?.ok);
    setState(success ? "success" : "error");
    if (success) window.dispatchEvent(new CustomEvent("vv:lead-submitted", { detail: { form: "hybrid_ev_match" } }));
  }

  return <form className="matchForm" onSubmit={submit}>
    <div className="matchFormIntro"><span>Gratis keuzehulp</span><strong>Uw profiel in zeven vragen</strong></div>
    <div className="matchQuestions">
      <fieldset><legend>1. Hoeveel rijdt u per jaar?</legend><div className="optionGrid"><label><input type="radio" name="annualKm" value="tot 10.000 km" required /><span>Tot 10.000 km</span></label><label><input type="radio" name="annualKm" value="10.000–20.000 km" /><span>10.000–20.000 km</span></label><label><input type="radio" name="annualKm" value="meer dan 20.000 km" /><span>Meer dan 20.000 km</span></label></div></fieldset>
      <fieldset><legend>2. Hoe lang is uw dagelijkse rit?</legend><div className="optionGrid"><label><input type="radio" name="dailyDistance" value="tot-50" required /><span>Tot 50 km</span></label><label><input type="radio" name="dailyDistance" value="50-150" /><span>50–150 km</span></label><label><input type="radio" name="dailyDistance" value="150-plus" /><span>Meer dan 150 km</span></label></div></fieldset>
      <fieldset><legend>3. Kunt u structureel laden?</legend><div className="optionGrid"><label><input type="radio" name="charging" value="home-or-work" required /><span>Thuis of op werk</span></label><label><input type="radio" name="charging" value="sometimes" /><span>Soms openbaar</span></label><label><input type="radio" name="charging" value="none" /><span>Nee</span></label></div></fieldset>
      <fieldset><legend>4. Hoe vaak maakt u lange ritten?</legend><div className="optionGrid"><label><input type="radio" name="longTrips" value="rarely" required /><span>Zelden</span></label><label><input type="radio" name="longTrips" value="monthly" /><span>Maandelijks</span></label><label><input type="radio" name="longTrips" value="often" /><span>Wekelijks</span></label></div></fieldset>
      <fieldset><legend>5. Heeft u trekgewicht nodig?</legend><div className="optionGrid optionGridTwo"><label><input type="radio" name="towing" value="no" required /><span>Nee</span></label><label><input type="radio" name="towing" value="yes" /><span>Ja</span></label></div></fieldset>
      <fieldset><legend>6. Heeft u al een voorkeur?</legend><div className="optionGrid"><label><input type="radio" name="preference" value="hybride" required /><span>Hybride</span></label><label><input type="radio" name="preference" value="elektrisch" /><span>Elektrisch</span></label><label><input type="radio" name="preference" value="open" /><span>Nog open</span></label></div></fieldset>
      <fieldset><legend>7. Wat is uw budget?</legend><label className="matchInput"><span>Budget in euro</span><input name="budgetEur" type="number" min="10000" max="150000" step="500" placeholder="Bijvoorbeeld 32.500" required /></label><div className="optionGrid optionGridTwo"><label><input type="radio" name="tradeIn" value="no" required /><span>Geen inruil</span></label><label><input type="radio" name="tradeIn" value="yes" /><span>Wel inruil</span></label></div></fieldset>
    </div>
    <div className="matchContact"><label>Naam<input name="name" autoComplete="name" minLength={2} required /></label><label>E-mailadres<input name="email" type="email" autoComplete="email" /></label><label>Telefoon<input name="phone" type="tel" autoComplete="tel" minLength={8} /></label></div>
    <div className="formHoneypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="consent"><input name="consent" type="checkbox" required /><span>Ik ga ermee akkoord dat Volt &amp; Vroom mijn gegevens gebruikt om de uitslag te tonen en persoonlijk contact op te nemen. Lees het <a href="/privacy">privacybeleid</a>.</span></label>
    <button className="button matchSubmit" type="submit" disabled={state === "submitting"}>{state === "submitting" ? "Profiel wordt beoordeeld…" : "Bekijk mijn indicatie"}</button>
    {result && <div className={`matchResult ${state}`} aria-live="polite"><span>Uw eerste indicatie</span><h2>{result.title}</h2><p>{result.text} Dit is een eerste richting; wij controleren de keuze persoonlijk op budget, modellen en totale kosten.</p>{state === "success" ? <strong>Uw profiel is ontvangen. Wij nemen persoonlijk contact met u op.</strong> : <strong>Opslaan lukte niet. Bel 0646585468 of mail naar sales@voltvroom.nl.</strong>}</div>}
  </form>;
}
