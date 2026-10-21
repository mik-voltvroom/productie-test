"use client";

import type { Appointment, LeadActivity, Quote, TradeIn } from "@/types";
import { db } from "@/lib/firebase-client";
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
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";

type CrmRecord = LeadActivity | Appointment | Quote | TradeIn;
type CollectionName = "leadActivities" | "appointments" | "quotes" | "tradeIns";

async function listByLead<T extends CrmRecord>(collectionName: CollectionName, leadId: string): Promise<T[]> {
  const snapshot = await getDocs(query(collection(db!, collectionName), where("leadId", "==", leadId)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T));
}

async function saveRecord<T extends CrmRecord>(collectionName: CollectionName, record: T): Promise<void> {
  await setDoc(doc(db!, collectionName, record.id), record, { merge: true });
}

export async function listLeadActivities(leadId: string): Promise<LeadActivity[]> {
  if (integrationMode !== "firebase" || !db) return getActivities().filter(item => item.leadId === leadId);
  const items = await listByLead<LeadActivity>("leadActivities", leadId);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveLeadActivity(activity: LeadActivity): Promise<void> {
  if (integrationMode !== "firebase" || !db) {
    const items = getActivities();
    const index = items.findIndex(item => item.id === activity.id);
    if (index >= 0) items[index] = activity; else items.unshift(activity);
    return saveActivities(items);
  }
  return saveRecord("leadActivities", activity);
}

export async function listLeadAppointments(leadId: string): Promise<Appointment[]> {
  if (integrationMode !== "firebase" || !db) return getAppointments().filter(item => item.leadId === leadId);
  const items = await listByLead<Appointment>("appointments", leadId);
  return items.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function saveAppointment(appointment: Appointment): Promise<void> {
  if (integrationMode !== "firebase" || !db) {
    const items = getAppointments();
    const index = items.findIndex(item => item.id === appointment.id);
    if (index >= 0) items[index] = appointment; else items.unshift(appointment);
    return saveAppointments(items);
  }
  return saveRecord("appointments", appointment);
}

export async function listLeadQuotes(leadId: string): Promise<Quote[]> {
  if (integrationMode !== "firebase" || !db) return getQuotes().filter(item => item.leadId === leadId);
  const items = await listByLead<Quote>("quotes", leadId);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveQuote(quote: Quote): Promise<void> {
  if (integrationMode !== "firebase" || !db) {
    const items = getQuotes();
    const index = items.findIndex(item => item.id === quote.id);
    if (index >= 0) items[index] = quote; else items.unshift(quote);
    return saveQuotes(items);
  }
  return saveRecord("quotes", quote);
}

export async function listLeadTradeIns(leadId: string): Promise<TradeIn[]> {
  if (integrationMode !== "firebase" || !db) return getTradeIns().filter(item => item.leadId === leadId);
  const items = await listByLead<TradeIn>("tradeIns", leadId);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveTradeIn(tradeIn: TradeIn): Promise<void> {
  if (integrationMode !== "firebase" || !db) {
    const items = getTradeIns();
    const index = items.findIndex(item => item.id === tradeIn.id);
    if (index >= 0) items[index] = tradeIn; else items.unshift(tradeIn);
    return saveTradeIns(items);
  }
  return saveRecord("tradeIns", tradeIn);
}
