"use client";
import type { Lead } from "@/types";
import { crmRequest } from "@/lib/repositories/crm-http";
import { integrationMode } from "@/lib/config";
import { getLeads, saveLeads } from "@/lib/demo-store";


export async function listLeads(): Promise<Lead[]> {
  if (integrationMode !== "firebase") return getLeads();
  return crmRequest<Lead[]>("leads");
}

export async function saveLead(lead: Lead, fields: ("status" | "owner" | "nextActionAt" | "hasTradeIn")[] = ["status", "owner", "nextActionAt", "hasTradeIn"]): Promise<void> {
  if (integrationMode !== "firebase") {
    const leads = getLeads();
    const index = leads.findIndex(item => item.id === lead.id);
    if (index >= 0) leads[index] = lead; else leads.unshift(lead);
    return saveLeads(leads);
  }
  if (!lead.id) throw new Error("Lead-ID ontbreekt.");
  const patch = Object.fromEntries(fields.filter(key => lead[key] !== undefined).map(key => [key, lead[key]]));
  await crmRequest("leads", { id: lead.id, patch });
}
