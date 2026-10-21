import { z } from "zod";
export { vehicleContactHref } from "@/lib/contact/links";

export const contactInterests = ["Adviesgesprek", "Proefrit plannen", "Inruil bespreken", "Vraag over voorraad"] as const;
export const daypartLabels = { morning: "Ochtend", afternoon: "Middag", any: "Geen voorkeur" } as const;
export type ContactVehicle = { id: string; label: string };

export const vehicleIdSchema = z.string().trim().min(1).max(120)
  .regex(/^[^/\u0000-\u001f\u007f]+$/)
  .refine(value => value !== "." && value !== "..");

export function contactVehicle(vehicle: { id: string; brand: string; model: string; trim: string }): ContactVehicle {
  return { id: vehicle.id, label: [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ") };
}

export function contactContext(vehicles: ContactVehicle[], params: { vehicleId?: unknown; intent?: unknown }) {
  const parsedId = vehicleIdSchema.safeParse(params.vehicleId);
  const selected = parsedId.success ? vehicles.find(vehicle => vehicle.id === parsedId.data) : undefined;
  return {
    initialVehicleId: selected?.id ?? "",
    initialInterest: params.intent === "proefrit" ? "Proefrit plannen" as const
      : params.intent === "vraag" ? "Vraag over voorraad" as const : "Adviesgesprek" as const,
    vehicleNotice: params.vehicleId !== undefined && !selected
      ? "De auto uit deze link is niet meer beschikbaar of de link is ongeldig. Kies een auto uit de actuele voorraad of stuur een algemene vraag."
      : "",
  };
}

export function todayInGroningen(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const optionalText = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(
  value => typeof value === "string" && !value.trim() ? undefined : value,
  schema.optional(),
);

const preferredDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kies een geldige datum.")
  .refine(value => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Kies een geldige datum.")
  .refine(value => value >= todayInGroningen(), "Kies vandaag of een latere datum.");

// Shared with the contact form; legacy leads (e.g. the choice guide) need no interest or appointment.
export const leadSubmissionSchema = z.object({
  type: z.enum(["general", "financial_lease"]).optional(),
  vehicleId: optionalText(vehicleIdSchema),
  name: z.string().trim().min(2, "Vul uw naam in (minimaal twee tekens).").max(120),
  email: optionalText(z.string().trim().email("Vul een geldig e-mailadres in.").max(254)),
  phone: optionalText(z.string().trim().min(8, "Vul een geldig telefoonnummer in.").max(40)
    .regex(/^[+\d\s().-]+$/, "Vul een geldig telefoonnummer in.")
    .refine(value => value.replace(/\D/g, "").length >= 8, "Vul een geldig telefoonnummer in.")),
  channel: z.enum(["website", "whatsapp", "phone", "merchant", "other"]).default("website"),
  message: z.string().trim().max(2000, "Gebruik maximaal 2000 tekens voor uw bericht.").optional(),
  interest: z.enum(contactInterests).optional(),
  preferredContact: z.enum(["phone", "email", "whatsapp"]).optional(),
  testDrive: z.object({ preferredDate: preferredDateSchema, daypart: z.enum(["morning", "afternoon", "any"], { errorMap: () => ({ message: "Kies een gewenst dagdeel." }) }) }).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Geef toestemming om uw aanvraag te beantwoorden." }) }),
  budgetEur: z.number().nonnegative().optional(),
  financingNeeded: z.boolean().optional(),
  hasTradeIn: z.boolean().optional(),
  website: z.string().max(0).optional(),
}).superRefine((data, context) => {
  if (!data.email && !data.phone) context.addIssue({ code: "custom", path: ["phone"], message: "Vul een telefoonnummer of e-mailadres in zodat we u kunnen bereiken." });
  if (data.preferredContact === "email" && !data.email) context.addIssue({ code: "custom", path: ["email"], message: "Vul uw e-mailadres in of kies een andere contactvoorkeur." });
  if ((data.preferredContact === "phone" || data.preferredContact === "whatsapp") && !data.phone) context.addIssue({ code: "custom", path: ["phone"], message: "Vul uw telefoonnummer in of kies een andere contactvoorkeur." });
  if (data.interest === "Proefrit plannen") {
    if (!data.vehicleId) context.addIssue({ code: "custom", path: ["vehicleId"], message: "Kies de auto waarin u een proefrit wilt maken." });
    if (!data.testDrive) context.addIssue({ code: "custom", path: ["testDrive"], message: "Kies een gewenste datum en een dagdeel voor uw proefrit." });
  } else if (data.testDrive) context.addIssue({ code: "custom", path: ["testDrive"], message: "Kies Proefrit plannen om een proefritmoment mee te geven." });
});

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;

export function contactLeadMessage(data: LeadSubmission, vehicleTitle?: string) {
  if (!data.interest) return data.message;
  const preferredContactLabels = { phone: "Bellen", email: "E-mail", whatsapp: "WhatsApp" };
  return [
    `${data.interest}.`,
    vehicleTitle ? `Gewenste auto: ${vehicleTitle} (ID: ${data.vehicleId}).` : "",
    data.preferredContact ? `Voorkeur contact: ${preferredContactLabels[data.preferredContact]}.` : "",
    data.testDrive ? `Gewenste proefrit: ${data.testDrive.preferredDate}, ${daypartLabels[data.testDrive.daypart]}. Afspraak pas definitief na bevestiging door Volt & Vroom.` : "",
    data.message,
  ].filter(Boolean).join(" ");
}
