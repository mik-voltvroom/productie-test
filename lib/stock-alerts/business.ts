import { z } from "zod";
import type { Vehicle } from "@/types";
import { isPublishedOnWebsite } from "@/lib/vehicle/publication";
import { vehicleIdentityKeys } from "@/lib/vehicle/identity";
import { vehiclePresentation } from "@/lib/vehicle/presentation";
import { vehicleCategory } from "@/lib/vehicle/business";

export const consentVersion = "stock-alert-2026-10-17-v1";
export const consentText = "Ik wil per e-mail een voorraadalert ontvangen voor mijn opgeslagen autowensen. Ik kan mij op ieder moment uitschrijven. Dit is geen nieuwsbriefinschrijving.";
const text = z.string().trim().min(1).max(80);
const cents = z.number().int().min(1).max(100_000_000);
export const criteriaSchema = z.object({
  allStock: z.boolean().default(false), brand: text.optional(), model: text.optional(),
  drive: z.enum(["any", "hybrid", "electric", "combustion"]).default("any"),
  driveType: z.enum(["full-hybrid", "plug-in-hybrid", "electric", "combustion"]).optional(),
  category: z.enum(["all", "hybrid", "electric", "icons"]).default("all"),
  maxPriceCents: cents.optional(), minPriceCents: cents.optional(),
  minYear: z.number().int().min(1886).max(2100).optional(), maxYear: z.number().int().min(1886).max(2100).optional(),
  maxMileageKm: z.number().int().min(0).max(2_000_000).optional(), fuelType: text.optional(), trim: text.optional(),
  bodyStyle: text.refine(value=>!["onbekend","unknown"].includes(value.normalize("NFKC").toLocaleLowerCase("nl-NL")),"Kies een bekend carrosserietype.").optional(),
}).strict().superRefine((value, context) => {
  const specific = Boolean(value.brand || value.model || value.drive !== "any" || value.driveType || value.category !== "all"
    || value.maxPriceCents || value.minPriceCents || value.minYear || value.maxYear || value.maxMileageKm !== undefined || value.fuelType || value.trim || value.bodyStyle);
  if (!value.allStock && !specific) context.addIssue({code:"custom",message:"Kies minimaal één wens of expliciet Alle nieuwe voorraad."});
  if (value.allStock && specific) context.addIssue({code:"custom",message:"Alle nieuwe voorraad kan niet met specifieke filters worden gecombineerd."});
  if (value.model && !value.brand) context.addIssue({code:"custom",path:["brand"],message:"Kies eerst een merk voor dit model."});
  if (value.minPriceCents && value.maxPriceCents && value.minPriceCents > value.maxPriceCents) context.addIssue({code:"custom",message:"De minimumprijs ligt boven de maximumprijs."});
  if (value.minYear && value.maxYear && value.minYear > value.maxYear) context.addIssue({code:"custom",message:"De bouwjaargrenzen zijn omgekeerd."});
});
export type AlertCriteria = z.infer<typeof criteriaSchema>;
export const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
export const signupSchema = z.object({email:emailSchema,criteria:criteriaSchema,consent:z.literal(true),website:z.string().max(0).default("")}).strict();
export type AlertStatus = "pending" | "active" | "unsubscribed" | "suppressed" | "expired";
export type JobState = "queued" | "processing" | "provider_accepted" | "delivered" | "bounced" | "failed" | "suppressed";
export type TokenPurpose = "confirm" | "manage" | "unsubscribe";
export interface Subscription {
  id: string; email: string; criteria: AlertCriteria; status: AlertStatus; revision: number;
  proposed?: AlertCriteria; confirmHash?: string; confirmedAt?: string; validUntil?: string;
  createdAt: string; updatedAt: string; expiresAt: string; consent: {version:string;text:string;at:string};
  matchAfter?:string; matchRevision?:number;
  proposedConsent?:{version:string;text:string;at:string};
}
export interface AlertJob {
  id:string; subscriptionId:string; kind:"confirmation"|"digest"; state:JobState; revision:number; day?:string;
  tokenHashes:Partial<Record<TokenPurpose,string>>; createdAt:string; dueAt:string; expiresAt:string;
  attempts:number; leaseId?:string; leaseUntil?:string; dispatchStartedAt?:string;
  providerId?:string; outcome?:"accepted"|"rejected"|"unknown"; reason?:string;
}
const normalized = (value: string | undefined) => value?.normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase("nl-NL");
export function alertDrive(vehicle: Pick<Vehicle,"driveType">) {
  return vehicleCategory(vehicle)==="icons"?"combustion":vehicle.driveType === "full-hybrid" || vehicle.driveType === "plug-in-hybrid" ? "hybrid" : vehicle.driveType;
}
export function inventoryAlertCriteria(filters:{brand:string;model:string;driveType:string;category:string;fuelType:string;trim:string;yearFrom:string;yearTo:string;priceFrom:string;priceTo:string},options:Pick<Vehicle,"brand"|"model">[]):Partial<AlertCriteria>{
  const matchingBrands=[...new Set(options.filter(option=>option.model===filters.model).map(option=>option.brand))];
  return {allStock:false,drive:"any",category:filters.category as AlertCriteria["category"],
    ...(filters.brand?{brand:filters.brand}:filters.model&&matchingBrands.length===1?{brand:matchingBrands[0]}:{}),
    ...(filters.model?{model:filters.model}:{}),...(filters.driveType?{driveType:filters.driveType as AlertCriteria["driveType"]}:{}),
    ...(filters.fuelType?{fuelType:filters.fuelType}:{}),...(filters.trim?{trim:filters.trim}:{}),
    ...(filters.yearFrom?{minYear:Number(filters.yearFrom)}:{}),...(filters.yearTo?{maxYear:Number(filters.yearTo)}:{}),
    ...(filters.priceFrom?{minPriceCents:Math.round(Number(filters.priceFrom)*100)}:{}),...(filters.priceTo?{maxPriceCents:Math.round(Number(filters.priceTo)*100)}:{})};
}
/** Input is a server record, before public projection. Never match internal/withdrawn inventory. */
export function matchesAlert(vehicle: Vehicle, criteria: AlertCriteria): boolean {
  if (!isPublishedOnWebsite(vehicle) || !vehicle.slug) return false;
  if (criteria.allStock) return true;
  const drive = alertDrive(vehicle);
  if (criteria.brand && normalized(vehicle.brand) !== normalized(criteria.brand)) return false;
  if (criteria.model && normalized(vehicle.model) !== normalized(criteria.model)) return false;
  if (criteria.drive !== "any" && criteria.drive !== drive) return false;
  if (criteria.driveType && criteria.driveType !== vehicle.driveType) return false;
  if (criteria.category !== "all" && (criteria.category === "icons" ? drive !== "combustion" : criteria.category !== drive)) return false;
  if (criteria.fuelType && normalized(criteria.fuelType) !== normalized(vehicle.fuelType)) return false;
  if (criteria.bodyStyle && (!vehicle.bodyStyle || ["onbekend","unknown"].includes(normalized(vehicle.bodyStyle)!) || normalized(criteria.bodyStyle)!==normalized(vehicle.bodyStyle))) return false;
  if (criteria.trim && normalized(criteria.trim) !== normalized(vehiclePresentation(vehicle.trim).edition)) return false;
  if (criteria.maxPriceCents !== undefined || criteria.minPriceCents !== undefined) {
    if (!Number.isSafeInteger(vehicle.priceCents) || vehicle.priceCents <= 0) return false;
    if (criteria.maxPriceCents !== undefined && vehicle.priceCents > criteria.maxPriceCents) return false;
    if (criteria.minPriceCents !== undefined && vehicle.priceCents < criteria.minPriceCents) return false;
  }
  if (criteria.minYear !== undefined || criteria.maxYear !== undefined) {
    if (!Number.isInteger(vehicle.year) || vehicle.year < 1886 || vehicle.year > 2100) return false;
    if (criteria.minYear !== undefined && vehicle.year < criteria.minYear) return false;
    if (criteria.maxYear !== undefined && vehicle.year > criteria.maxYear) return false;
  }
  if (criteria.maxMileageKm !== undefined && (!Number.isSafeInteger(vehicle.mileageKm) || vehicle.mileageKm < 0 || vehicle.mileageKm > criteria.maxMileageKm)) return false;
  return true;
}
export function notificationKeys(vehicle: Vehicle): string[] { return [`id:${vehicle.id}`, ...vehicleIdentityKeys(vehicle)]; }
export function localClock(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Amsterdam",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(now).map(part=>[part.type,part.value]));
  return {day:`${parts.year}-${parts.month}-${parts.day}`,digestDue:Number(parts.hour)>=9};
}
export function criteriaSummary(value: AlertCriteria): string {
  if (value.allStock) return "Alle nieuwe voorraad";
  return [value.brand,value.model,value.drive !== "any" ? ({hybrid:"Hybride",electric:"Elektrisch",combustion:"Benzine/overig"})[value.drive] : undefined,
    value.driveType, value.category !== "all" ? value.category : undefined, value.maxPriceCents ? `Tot € ${(value.maxPriceCents/100).toLocaleString("nl-NL")}` : undefined,
    value.minPriceCents ? `Vanaf € ${(value.minPriceCents/100).toLocaleString("nl-NL")}` : undefined,
    value.minYear ? `Vanaf ${value.minYear}` : undefined,value.maxYear ? `Tot ${value.maxYear}` : undefined,
    value.maxMileageKm !== undefined ? `Tot ${value.maxMileageKm.toLocaleString("nl-NL")} km` : undefined,value.fuelType,value.trim,value.bodyStyle].filter(Boolean).join(" · ");
}
