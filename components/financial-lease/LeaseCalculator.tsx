"use client";
import { useLeadSubmission } from "@/lib/contact/use-submission";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { calculateLease, defaultSelection, leaseTerms, type LeaseSelection } from "@/lib/financial-lease/business";
import styles from "./lease.module.css";
import cta from "@/components/vehicles/vehicle-cta.module.css";

const money = (cents: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
}).format(cents / 100);

function eurosToCents(value: string): number {
  if (value === "") return 0;
  const euros = Number(value);
  return Number.isFinite(euros) ? Math.round(euros * 100) : 0;
}

export function LeaseCalculator({
  vehicleId,
  priceCents,
  annualRateBps,
  compact = false,
  initialSelection = defaultSelection,
  initialNotice,
}: {
  vehicleId: string;
  priceCents: number;
  annualRateBps: number;
  compact?: boolean;
  initialSelection?: LeaseSelection;
  initialNotice?: string;
}) {
  const [selection, setSelection] = useState<LeaseSelection>(initialSelection);
  const [downPayment, setDownPayment] = useState(initialSelection.downPaymentCents ? String(initialSelection.downPaymentCents / 100) : "");
  const [balloon, setBalloon] = useState(initialSelection.balloonCents ? String(initialSelection.balloonCents / 100) : "");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const submitLead = useLeadSubmission();
  const inFlight = useRef(false);
  const formHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open) formHeading.current?.focus();
  }, [open]);

  let quote;
  let calculationError = "";
  try {
    quote = calculateLease(priceCents, selection, annualRateBps);
  } catch (cause) {
    calculationError = cause instanceof Error ? cause.message : "Controleer uw bedragen.";
  }

  function updateAmount(field: "downPaymentCents" | "balloonCents", value: string) {
    if (field === "downPaymentCents") setDownPayment(value);
    else setBalloon(value);
    setSelection(current => ({ ...current, [field]: eurosToCents(value) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || state === "done") return;
    inFlight.current = true;
    const data = new FormData(event.currentTarget);
    setState("sending");
    setError("");
    try {
      const response = await submitLead("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          expectedPriceCents: priceCents,
          expectedAnnualRateBps: annualRateBps,
          type: "financial_lease",
          companyName: data.get("companyName"),
          kvk: data.get("kvk"),
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
          leaseSelection: selection,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Uw aanvraag is niet opgeslagen. Controleer uw gegevens en probeer opnieuw.");
      }
      setState("done");
    } catch (cause) {
      inFlight.current = false;
      setError(cause instanceof Error ? cause.message : "Verbinding mislukt. Probeer opnieuw.");
      setState("idle");
    }
  }

  const controls = <>
    <div className={styles.fields}>
      <label>Looptijd
        <select
          value={selection.termMonths}
          disabled={state !== "idle"}
          onChange={event => setSelection({ ...selection, termMonths: Number(event.target.value) as LeaseSelection["termMonths"] })}
        >
          {leaseTerms.map(term => <option key={term} value={term}>{term} maanden</option>)}
        </select>
      </label>
      <label>Aanbetaling / inruil (€)
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max={(priceCents - 1) / 100}
          step="0.01"
          value={downPayment}
          placeholder="0"
          disabled={state !== "idle"}
          onChange={event => updateAmount("downPaymentCents", event.target.value)}
        />
      </label>
      <label>Slottermijn (€)
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max={Math.min(priceCents / 2, priceCents - selection.downPaymentCents - 1) / 100}
          step="0.01"
          value={balloon}
          placeholder="0"
          disabled={state !== "idle"}
          onChange={event => updateAmount("balloonCents", event.target.value)}
        />
      </label>
    </div>

    <p className={styles.help}>De slottermijn betaalt u aan het einde nog terug. Inruilwaarde is onder voorbehoud van beoordeling.</p>
  </>;

  return <section className={compact ? styles.compact : styles.card} id="financial-lease" aria-labelledby="lease-heading">
    {!compact && <p className="eyebrow">Voor ondernemers</p>}
    <h2 id="lease-heading">Financial lease{compact ? " · zakelijk" : ""}</h2>
    {!compact && <p>Verkoopprijs <strong>{money(priceCents)}</strong></p>}
    {!compact && controls}
    {initialNotice && <p className={styles.help}>{initialNotice}</p>}
    {calculationError && <p role="alert">{calculationError}</p>}
    <div className={styles.result} aria-live="polite">
      {quote && <>
        <span>Indicatieve maandtermijn</span>
        <strong>{money(quote.monthlyCents)} <small>p/m</small></strong>
        <span>{quote.termMonths} maanden · {money(selection.downPaymentCents)} aanbetaling · {money(selection.balloonCents)} slottermijn</span>
      </>}
    </div>
    <p className={styles.help}>Uitsluitend zakelijk. Indicatieve annuïtaire berekening, geen offerte of kredietgoedkeuring. Definitieve rente, looptijd, kosten en acceptatie worden door de financier bepaald. Onderhoud, verzekering en belastingen zijn niet inbegrepen.</p>

    {state === "done" ? <p role="status">Uw aanvraag is ontvangen. Volt &amp; Vroom neemt contact met u op voor een persoonlijk leasevoorstel.</p> : <>
      {!open && <button className={`button ${compact ? cta.dark : ""}`} disabled={!quote} type="button" aria-expanded={open} aria-controls="lease-lead-form" onClick={() => setOpen(true)}>{compact ? "Direct aanvragen" : "Vraag vrijblijvend leasevoorstel aan"}</button>}
      {compact && <details className={styles.adjust}><summary>Pas uw leaseberekening aan</summary>{controls}</details>}
      {open && <form id="lease-lead-form" onSubmit={submit} className={styles.form}>
        <h3 ref={formHeading} tabIndex={-1}>Uw zakelijke aanvraag</h3>
        <fieldset disabled={state === "sending"}>
          <div className={styles.fields}>
            <label>Bedrijfsnaam<input name="companyName" autoComplete="organization" required minLength={2} maxLength={160} /></label>
            <label>KvK-nummer<input name="kvk" inputMode="numeric" pattern="[0-9]{8}" title="8 cijfers" required maxLength={8} /></label>
            <label>Naam<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
            <label>Telefoon<input name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={40} /></label>
            <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          </div>
          <div hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className={styles.consent}><input type="checkbox" name="consent" required /> <span>Ik vraag zakelijk aan en ga akkoord met contact over deze aanvraag. Lees ons <a href="/privacy" target="_blank" rel="noreferrer">privacybeleid</a>.</span></label>
          <button className={`button ${compact ? cta.dark : ""}`} disabled={Boolean(calculationError)}>{state === "sending" ? "Aanvraag versturen…" : "Verstuur mijn aanvraag"}</button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>}
    </>}
  </section>;
}
