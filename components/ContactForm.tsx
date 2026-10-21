"use client";
import { useLeadSubmission } from "@/lib/contact/use-submission";

import { FormEvent, useId, useRef, useState } from "react";
import { contactInterests, daypartLabels, leadSubmissionSchema, type ContactVehicle } from "@/lib/contact/business";
import "./contact-form.css";

type FormState = "idle" | "submitting" | "success" | "error";
type FieldErrors = Record<string, string>;

export function ContactForm({ vehicles, initialVehicleId = "", initialInterest = "Adviesgesprek", vehicleNotice = "", minimumDate }: {
  vehicles: ContactVehicle[];
  initialVehicleId?: string;
  initialInterest?: typeof contactInterests[number];
  vehicleNotice?: string;
  minimumDate: string;
}) {
  const [state, setState] = useState<FormState>("idle");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [interest, setInterest] = useState(initialInterest);
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const [notice, setNotice] = useState(vehicleNotice);
  const submitLead = useLeadSubmission();
  const inFlight = useRef(false);
  const formId = useId();
  const isTestDrive = interest === "Proefrit plannen";
  const selectedVehicle = vehicles.find(vehicle => vehicle.id === vehicleId);

  function fieldProps(name: string) {
    return { id: `${formId}-${name}`, "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${formId}-${name}-error` : undefined };
  }
  function fieldError(name: string) {
    return errors[name] ? <span className="contactFieldError" id={`${formId}-${name}-error`}>{errors[name]}</span> : null;
  }
  function showErrors(form: HTMLFormElement, fieldErrors: FieldErrors, message: string) {
    setErrors(fieldErrors);
    setState("error");
    setFeedback(message);
    const control = form.elements.namedItem(Object.keys(fieldErrors)[0]);
    if (control instanceof HTMLElement) control.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The ref also covers two submit events before React has rendered the disabled button.
    if (inFlight.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      vehicleId,
      interest,
      preferredContact: String(form.get("preferredContact") || "") || undefined,
      channel: "website",
      message: String(form.get("message") || ""),
      testDrive: isTestDrive ? { preferredDate: String(form.get("preferredDate") || ""), daypart: String(form.get("daypart") || "") } : undefined,
      consent: form.get("consent") === "on",
      website: String(form.get("website") || ""),
    };
    const parsed = leadSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path.at(-1))] ??= issue.message;
      showErrors(formElement, fieldErrors, parsed.error.issues[0]?.message || "Controleer de ingevulde gegevens.");
      return;
    }

    inFlight.current = true;
    setState("submitting");
    setErrors({});
    setFeedback("");
    try {
      const response = await submitLead("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.ok === true) {
        setState("success");
        window.dispatchEvent(new CustomEvent("vv:lead-submitted", { detail: { form: "contact", interest } }));
        return;
      }

      const fieldErrors: FieldErrors = {};
      for (const [path, messages] of Object.entries(payload?.errors?.fieldErrors || {})) {
        if (Array.isArray(messages) && typeof messages[0] === "string") fieldErrors[path.split(".").at(-1)!] = messages[0];
      }
      showErrors(formElement, fieldErrors, payload?.error || "Versturen lukt nu niet. Bel 0646585468 of mail naar sales@voltvroom.nl.");
    } catch {
      setState("error");
      setFeedback("Versturen lukt nu niet. Controleer uw verbinding en probeer opnieuw, of bel 0646585468.");
    } finally {
      inFlight.current = false;
    }
  }

  if (state === "success") return <section className="contactForm" role="status">
    <div className="formHeader"><span>Aanvraag ontvangen</span></div>
    <h3>{isTestDrive ? "Uw proefritaanvraag is ontvangen." : "Uw aanvraag is ontvangen."}</h3>
    {selectedVehicle ? <p><strong>{selectedVehicle.label}</strong></p> : null}
    <p>{isTestDrive ? "Mik of Don neemt contact met u op om het moment af te stemmen. Uw afspraak staat pas vast na onze bevestiging." : "Mik of Don neemt persoonlijk contact met u op."}</p>
  </section>;

  return <form className="contactForm" onSubmit={submit} noValidate aria-busy={state === "submitting"}>
    <div className="formHeader"><span>Persoonlijk antwoord</span><strong>Mik of Don neemt contact met u op.</strong></div>
    <p className="contactNotice">Vul een telefoonnummer of e-mailadres in zodat we u kunnen bereiken.</p>
    {notice ? <p className="contactNotice" role="status">{notice}</p> : null}
    {vehicles.length === 0 ? <p className="contactNotice">Er staan op dit moment geen auto's in de keuzelijst. U kunt wel een algemene vraag stellen.</p> : null}
    <fieldset className="contactFields" disabled={state === "submitting"}>
      <legend className="visuallyHidden">Uw aanvraag en contactgegevens</legend>
      <div className="formGrid publicFormGrid">
        <label htmlFor={`${formId}-name`}>Naam <span className="fieldHint">verplicht</span><input {...fieldProps("name")} name="name" autoComplete="name" minLength={2} maxLength={120} required />{fieldError("name")}</label>
        <label htmlFor={`${formId}-phone`}>Telefoon <span className="fieldHint">optioneel</span><input {...fieldProps("phone")} name="phone" type="tel" autoComplete="tel" minLength={8} maxLength={40} />{fieldError("phone")}</label>
        <label className="span2" htmlFor={`${formId}-email`}>E-mailadres <span className="fieldHint">optioneel</span><input {...fieldProps("email")} name="email" type="email" autoComplete="email" maxLength={254} />{fieldError("email")}</label>
        <label htmlFor={`${formId}-preferredContact`}>Voorkeur contact<select {...fieldProps("preferredContact")} name="preferredContact" defaultValue=""><option value="">Geen voorkeur</option><option value="phone">Bel mij</option><option value="email">E-mail mij</option></select>{fieldError("preferredContact")}</label>
        <label htmlFor={`${formId}-interest`}>Waarmee kunnen we helpen?<select {...fieldProps("interest")} name="interest" value={interest} onChange={event => { setInterest(event.target.value as typeof interest); setErrors({}); setFeedback(""); }}>{contactInterests.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="span2" htmlFor={`${formId}-vehicleId`}>Voorkeursauto <span className="fieldHint">{isTestDrive ? "verplicht bij proefrit" : "optioneel"}</span><select {...fieldProps("vehicleId")} name="vehicleId" value={vehicleId} required={isTestDrive} onChange={event => { setVehicleId(event.target.value); setNotice(""); setErrors({}); setFeedback(""); }}><option value="">Nog geen voorkeur</option>{vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}</select>{fieldError("vehicleId")}</label>
        {isTestDrive ? <>
          <label htmlFor={`${formId}-preferredDate`}>Gewenste datum <span className="fieldHint">verplicht</span><input {...fieldProps("preferredDate")} name="preferredDate" type="date" min={minimumDate} required />{fieldError("preferredDate")}</label>
          <label htmlFor={`${formId}-daypart`}>Gewenst dagdeel<select {...fieldProps("daypart")} name="daypart" defaultValue="" required><option value="">Kies een dagdeel</option>{Object.entries(daypartLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{fieldError("daypart")}</label>
          <p className="span2 contactNotice">Dit is een aanvraag voor uw gewenste moment. De proefritafspraak staat pas vast nadat Volt &amp; Vroom deze heeft bevestigd.</p>
        </> : null}
        <label className="span2" htmlFor={`${formId}-message`}>{isTestDrive ? "Aanvullende vraag of toelichting" : "Uw vraag of toelichting"}<textarea {...fieldProps("message")} name="message" rows={3} maxLength={2000} placeholder="Vertel kort waarmee we u kunnen helpen." />{fieldError("message")}</label>
      </div>
      <div className="formHoneypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="consent" htmlFor={`${formId}-consent`}><input {...fieldProps("consent")} name="consent" type="checkbox" required /><span>Ik ga ermee akkoord dat Volt &amp; Vroom mijn gegevens gebruikt om contact op te nemen. Lees het <a href="/privacy">privacybeleid</a>.{fieldError("consent")}</span></label>
    </fieldset>
    <button className="button wide" type="submit" disabled={state === "submitting"}>{state === "submitting" ? "Wordt verstuurd…" : isTestDrive ? "Vraag een proefrit aan" : "Verstuur mijn aanvraag"}</button>
    <p className={`formFeedback ${state}`} role={state === "error" ? "alert" : "status"} aria-live="polite">{feedback}</p>
  </form>;
}
