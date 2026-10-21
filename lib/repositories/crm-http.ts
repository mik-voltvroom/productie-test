"use client";
export async function crmRequest<T>(collection: string, body?: unknown, leadId?: string): Promise<T> {
  const response = await fetch(`/api/vvos/crm/${collection}${leadId ? `?leadId=${encodeURIComponent(leadId)}` : ""}`, {
    method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
    headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "CRM-verzoek mislukt.");
  return result.items as T;
}
