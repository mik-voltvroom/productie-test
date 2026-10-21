"use client";

import type { Appointment, LeadActivity, Quote, TradeIn } from "@/types";
import { crmRequest } from "@/lib/repositories/crm-http";
import { integrationMode } from "@/lib/config";
import {
  getActivities,
  getAppointments,
  getQuotes,
  getTradeIns,
  saveActivities,
  saveAppointments,
  saveQuotes,
  saveTradeIns,
} from "@/lib/demo-store";


type CrmRecord = LeadActivity | Appointment | Quote | TradeIn;
type CollectionName = "leadActivities" | "appointments" | "quotes" | "tradeIns";

async function listByLead<T extends CrmRecord>(collectionName: CollectionName, leadId: string): Promise<T[]> {
  return crmRequest<T[]>(collectionName, undefined, leadId);
}

async function saveRecord<T extends CrmRecord>(collectionName: CollectionName, record: T): Promise<void> {
  await crmRequest(collectionName, record);
}

export async function listLeadActivities(leadId: string): Promise<LeadActivity[]> {
  if (integrationMode !== "firebase") return getActivities().filter(item => item.leadId === leadId);
  const items = await listByLead<LeadActivity>("leadActivities", leadId);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveLeadActivity(activity: LeadActivity): Promise<void> {
  if (integrationMode !== "firebase") {
    const items = getActivities();
    const index = items.findIndex(item => item.id === activity.id);
    if (index >= 0) items[index] = activity; else items.unshift(activity);
    return saveActivities(items);
  }
  return saveRecord("leadActivities", activity);
}

export async function listLeadAppointments(leadId: string): Promise<Appointment[]> {
  if (integrationMode !== "firebase") return getAppointments().filter(item => item.leadId === leadId);
  const items = await listByLead<Appointment>("appointments", leadId);
  return items.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function saveAppointment(appointment: Appointment): Promise<void> {
  if (integrationMode !== "firebase") {
    const items = getAppointments();
    const index = items.findIndex(item => item.id === appointment.id);
    if (index >= 0) items[index] = appointment; else items.unshift(appointment);
    return saveAppointments(items);
  }
  return saveRecord("appointments", appointment);
}

export async function listLeadQuotes(leadId: string): Promise<Quote[]> {
  if (integrationMode !== "firebase") return getQuotes().filter(item => item.leadId === leadId);
  const items = await listByLead<Quote>("quotes", leadId);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveQuote(quote: Quote): Promise<void> {
  if (integrationMode !== "firebase") {
    const items = getQuotes();
    const index = items.findIndex(item => item.id === quote.id);
    if (index >= 0) items[index] = quote; else items.unshift(quote);
    return saveQuotes(items);
  }
  return saveRecord("quotes", quote);
}

export async function listLeadTradeIns(leadId: string): Promise<TradeIn[]> {
  if (integrationMode !== "firebase") return getTradeIns().filter(item => item.leadId === leadId);
  const items = await listByLead<TradeIn>("tradeIns", leadId);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveTradeIn(tradeIn: TradeIn): Promise<void> {
  if (integrationMode !== "firebase") {
    const items = getTradeIns();
    const index = items.findIndex(item => item.id === tradeIn.id);
    if (index >= 0) items[index] = tradeIn; else items.unshift(tradeIn);
    return saveTradeIns(items);
  }
  return saveRecord("tradeIns", tradeIn);
}
