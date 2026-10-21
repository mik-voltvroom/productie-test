import { NextResponse } from "next/server";
import { integrationMode, isFirebaseAdminConfigured, isFirebaseClientConfigured } from "@/lib/config";
import { isAuthenticationRequired } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "VVOS",
    version: process.env.npm_package_version ?? "0.7.1-agent",
    mode: integrationMode,
    checks: {
      firebaseClient: isFirebaseClientConfigured,
      firebaseAdmin: isFirebaseAdminConfigured,
      authenticationRequired: isAuthenticationRequired(),
      merchantConfigured: Boolean(process.env.GOOGLE_MERCHANT_ID && process.env.GOOGLE_MERCHANT_DATASOURCE),
      rdwConfigured: Boolean(process.env.RDW_API_BASE_URL),
      vweWebhookProtected: Boolean(process.env.VWE_WEBHOOK_SECRET),
      hexonWebhookProtected: Boolean(process.env.HEXON_SYNC_USERNAME && process.env.HEXON_SYNC_PASSWORD),
    },
    timestamp: new Date().toISOString(),
  });
}
