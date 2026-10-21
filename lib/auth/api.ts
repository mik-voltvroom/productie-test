import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import type { VvosPermission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import type { VvosRole } from "@/lib/auth/session";
import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";

export interface ApiActor {
  uid: string;
  email: string | null;
  role: VvosRole;
}

const roles = new Set<VvosRole>(["owner", "admin", "sales", "marketing", "workshop", "finance", "readonly"]);

function roleFromClaim(value: unknown): VvosRole {
  const normalized = typeof value === "string" ? value.toLowerCase() : "readonly";
  return roles.has(normalized as VvosRole) ? (normalized as VvosRole) : "readonly";
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function authorizeApi(
  request: Request,
  permission: VvosPermission,
): Promise<{ actor: ApiActor | null; response?: NextResponse }> {
  if (isLocalDemoAuthBypassAllowed()) {
    return { actor: { uid: "demo-agent", email: "demo@voltvroom.local", role: "owner" } };
  }

  if (!adminAuth) {
    return {
      actor: null,
      response: NextResponse.json({ ok: false, error: "Authenticatieservice is niet beschikbaar." }, { status: 503 }),
    };
  }

  const sessionCookie = readCookie(request, "vvos_session");
  if (!sessionCookie) {
    return { actor: null, response: NextResponse.json({ ok: false, error: "Niet ingelogd." }, { status: 401 }) };
  }

  try {
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = roleFromClaim(claims.role);
    if (!hasPermission(role, permission)) {
      return { actor: null, response: NextResponse.json({ ok: false, error: "Onvoldoende rechten." }, { status: 403 }) };
    }
    return {
      actor: {
        uid: claims.uid,
        email: typeof claims.email === "string" ? claims.email : null,
        role,
      },
    };
  } catch {
    return { actor: null, response: NextResponse.json({ ok: false, error: "Sessie is ongeldig of verlopen." }, { status: 401 }) };
  }
}
