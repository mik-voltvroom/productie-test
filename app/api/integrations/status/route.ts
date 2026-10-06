import { NextResponse } from "next/server";
import type { IntegrationStatus } from "@/types";
import { authorizeApi } from "@/lib/auth/api";

export async function GET(request: Request) {
  const auth = await authorizeApi(request, "integrations.read");
  if (auth.response) return auth.response;
  const items: IntegrationStatus[] = [
    { key: "firebase", label: "Firebase", configured: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_ADMIN_PROJECT_ID), mode: process.env.VVOS_DATA_MODE === "firebase" ? "live" : "demo", detail: "Authenticatie, Firestore en Storage" },
    { key: "rdw", label: "RDW voertuigdata", configured: Boolean(process.env.RDW_API_BASE_URL), mode: process.env.RDW_API_BASE_URL ? "live" : "demo", detail: "Kenteken- en voertuigverrijking" },
    { key: "hexon", label: "Mobilox via Hexon", configured: Boolean(process.env.HEXON_SYNC_USERNAME && process.env.HEXON_SYNC_PASSWORD), mode: process.env.HEXON_SYNC_USERNAME && process.env.HEXON_SYNC_PASSWORD ? "live" : "disabled", detail: "Mobilox levert XML rechtstreeks aan op /api/hexon/inventory. Configuratie aanwezig betekent niet dat een recente synchronisatie is bevestigd." },
    { key: "merchant", label: "Google Merchant Center", configured: Boolean(process.env.GOOGLE_MERCHANT_ID && process.env.GOOGLE_MERCHANT_DATASOURCE), mode: process.env.GOOGLE_MERCHANT_ID ? "live" : "demo", detail: "Vehicle feed en synchronisatie" },
    { key: "whatsapp", label: "WhatsApp Business", configured: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_TOKEN), mode: process.env.WHATSAPP_API_URL ? "live" : "disabled", detail: "Leadopvolging en afspraken" },
    { key: "email", label: "E-mail", configured: Boolean(process.env.EMAIL_API_URL && process.env.EMAIL_API_KEY), mode: process.env.EMAIL_API_URL ? "live" : "disabled", detail: "Transacties en nurture flows" },
  ];
  return NextResponse.json(items);
}
