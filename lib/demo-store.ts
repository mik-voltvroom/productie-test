"use client";
import type { Appointment, AutomationRule, Lead, LeadActivity, Quote, TradeIn, Vehicle } from "@/types";
import { vehicles as seedVehicles } from "@/lib/sample-data";
import { normalizeVehicleDocument } from "@/lib/vehicle/money";

const VEHICLES_KEY = "vvos.vehicles.v2";
const LEADS_KEY = "vvos.leads.v2";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function getVehicles(): Vehicle[] {
  if (typeof window === "undefined") return seedVehicles;
  const existing = safeParse<Record<string, unknown>[]>(localStorage.getItem(VEHICLES_KEY), []);
  if (existing.length) {
    try {
      const normalized = existing.map((vehicle) => normalizeVehicleDocument(String(vehicle.id ?? ""), vehicle));
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(normalized));
      return normalized;
    } catch {
      localStorage.removeItem(VEHICLES_KEY);
    }
  }
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(seedVehicles));
  return seedVehicles;
}

export function saveVehicles(vehicles: Vehicle[]): void {
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
  window.dispatchEvent(new Event("vvos:vehicles"));
}

export function upsertVehicle(vehicle: Vehicle): void {
  const current = getVehicles();
  const index = current.findIndex(item => item.id === vehicle.id);
  if (index >= 0) current[index] = vehicle; else current.unshift(vehicle);
  saveVehicles(current);
}

export function deleteVehicle(id: string): void {
  saveVehicles(getVehicles().filter(item => item.id !== id));
}

const seedLeads: Lead[] = [
  { id: "LEAD-1001", name: "S. de Vries", phone: "06 12345678", channel: "website", vehicleId: "VV-2026-001", consent: true, status: "new", createdAt: new Date().toISOString(), message: "Graag een proefrit op zaterdag." },
  { id: "LEAD-1002", name: "J. Bakker", email: "j.bakker@example.nl", channel: "merchant", vehicleId: "VV-2026-002", consent: true, status: "contacted", createdAt: new Date(Date.now() - 86400000).toISOString(), message: "Wat is de inruilwaarde van mijn huidige auto?" }
];

export function getLeads(): Lead[] {
  if (typeof window === "undefined") return seedLeads;
  const existing = safeParse<Lead[]>(localStorage.getItem(LEADS_KEY), []);
  if (existing.length) return existing;
  localStorage.setItem(LEADS_KEY, JSON.stringify(seedLeads));
  return seedLeads;
}

export function saveLeads(leads: Lead[]): void {
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  window.dispatchEvent(new Event("vvos:leads"));
}


const ACTIVITIES_KEY = "vvos.activities.v4";
const APPOINTMENTS_KEY = "vvos.appointments.v4";
const QUOTES_KEY = "vvos.quotes.v4";
const TRADE_INS_KEY = "vvos.tradeins.v4";
const AUTOMATIONS_KEY = "vvos.automations.v4";

function readCollection<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  return safeParse<T[]>(localStorage.getItem(key), fallback);
}
function writeCollection<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(`vvos:${key}`));
}
export const getActivities = () => readCollection<LeadActivity>(ACTIVITIES_KEY, []);
export const saveActivities = (v: LeadActivity[]) => writeCollection(ACTIVITIES_KEY, v);
export const getAppointments = () => readCollection<Appointment>(APPOINTMENTS_KEY, []);
export const saveAppointments = (v: Appointment[]) => writeCollection(APPOINTMENTS_KEY, v);
export const getQuotes = () => readCollection<Quote>(QUOTES_KEY, []);
export const saveQuotes = (v: Quote[]) => writeCollection(QUOTES_KEY, v);
export const getTradeIns = () => readCollection<TradeIn>(TRADE_INS_KEY, []);
export const saveTradeIns = (v: TradeIn[]) => writeCollection(TRADE_INS_KEY, v);
const defaultAutomationRules: AutomationRule[] = [
  { id:"AUTO-1", name:"Directe ontvangstbevestiging", trigger:"lead_created", delayMinutes:0, channel:"email", template:"Bedankt voor uw interesse. Wij nemen persoonlijk contact met u op.", enabled:true },
  { id:"AUTO-2", name:"Hot lead taak", trigger:"lead_created", delayMinutes:0, channel:"task", template:"Bel deze lead binnen tien minuten.", enabled:true },
  { id:"AUTO-3", name:"Geen reactie na 24 uur", trigger:"lead_idle", delayMinutes:1440, channel:"whatsapp", template:"Goedendag, heeft u nog vragen over de auto?", enabled:true },
  { id:"AUTO-4", name:"Proefrit bevestiging", trigger:"appointment_created", delayMinutes:0, channel:"email", template:"Uw proefrit staat gepland. Wij zetten de auto voor u klaar.", enabled:true },
  { id:"AUTO-5", name:"Offerte opvolging", trigger:"quote_sent", delayMinutes:1440, channel:"task", template:"Neem persoonlijk contact op over de verstuurde offerte.", enabled:true }
];
export const getAutomationRules = () => readCollection<AutomationRule>(AUTOMATIONS_KEY, defaultAutomationRules);
export const saveAutomationRules = (v: AutomationRule[]) => writeCollection(AUTOMATIONS_KEY, v);
