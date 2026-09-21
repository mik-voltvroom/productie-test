"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm({ vehicles }: { vehicles: { id: string; label: string }[] }) {
  const [state, setState] = useState<FormState>("idle");
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setFeedback("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const interest = String(form.get("interest") || "Adviesgesprek");
    const contactPreference = String(form.get("contactPreference") || "phone");
    const vehicleId = String(form.get("vehicleId") || "");
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();

    if (!email && !phone) {
      setState("error");
      setFeedback("Vul een telefoonnummer of e-mailadres in zodat we u kunnen bereiken.");
      return;
    }

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        email: email || undefined,
        phone: phone || undefined,
        vehicleId: vehicleId || undefined,
        channel: "website",
        message: `${interest}. Voorkeur contact: ${contactPreference}. ${String(form.get("message") || "Geen aanvullende toelichting.")}`,
        consent: form.get("consent") === "on",
        website: String(form.get("website") || ""),
      }),
    }).catch(() => null);

    if (response?.ok) {
      setState("success");
      setFeedback("Gelukt. Uw aanvraag is ontvangen; we nemen persoonlijk contact met u op.");
      window.dispatchEvent(new CustomEvent("vv:lead-submitted", { detail: { form: "contact", interest } }));
      formElement.reset();
    } else {
      setState("error");
      setFeedback("Versturen lukt nu niet. Bel 0611669111 of mail naar sales@voltvroom.nl.");
    }
  }

  return <form className="contactForm" onSubmit={submit} noValidate>
    <div className="formHeader"><span>Persoonlijk antwoord</span><strong>U krijgt persoonlijk antwoord van Mik.</strong></div>
    <div className="formGrid publicFormGrid">
      <label>Naam <span className="fieldHint">verplicht</span><input name="name" autoComplete="name" minLength={2} required /></label>
      <label>Telefoon <span className="fieldHint">optioneel</span><input name="phone" type="tel" autoComplete="tel" minLength={8} /></label>
      <label className="span2">E-mailadres <span className="fieldHint">optioneel</span><input name="email" type="email" autoComplete="email" /></label>
      <label>Voorkeur contact<select name="contactPreference" defaultValue="phone"><option value="phone">Bel mij</option><option value="email">E-mail mij</option></select></label>
      <label>Waarmee kunnen we helpen?<select name="interest" defaultValue="Adviesgesprek"><option>Adviesgesprek</option><option>Proefrit plannen</option><option>Inruil bespreken</option><option>Vraag over voorraad</option></select></label>
      <label className="span2">Voorkeursauto<select name="vehicleId" defaultValue=""><option value="">Nog geen voorkeur</option>{vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}</select></label>
      <label className="span2">Vertel kort hoe u rijdt<textarea name="message" rows={4} placeholder="Bijvoorbeeld: 60 km per dag, vooral snelweg, thuis laden is mogelijk." /></label>
    </div>
    <div className="formHoneypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="consent"><input name="consent" type="checkbox" required /><span>Ik ga ermee akkoord dat Volt &amp; Vroom mijn gegevens gebruikt om contact op te nemen. Lees het <a href="/privacy">privacybeleid</a>.</span></label>
    <button className="button wide" type="submit" disabled={state === "submitting"}>{state === "submitting" ? "Wordt verstuurd…" : "Vraag advies aan"}</button>
    <p className={`formFeedback ${state}`} aria-live="polite">{feedback}</p>
  </form>;
}
