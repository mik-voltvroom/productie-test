import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";

export type VvosRole = "owner" | "admin" | "sales" | "marketing" | "workshop" | "finance" | "readonly";

export interface VvosSessionUser {
  uid: string;
  email: string | null;
  role: VvosRole;
  claims: DecodedIdToken;
}

const allowedRoles = new Set<VvosRole>([
  "owner",
  "admin",
  "sales",
  "marketing",
  "workshop",
  "finance",
  "readonly",
]);

function resolveRole(claims: DecodedIdToken): VvosRole {
  const rawRole = typeof claims.role === "string" ? claims.role.toLowerCase() : "readonly";
  return allowedRoles.has(rawRole as VvosRole) ? (rawRole as VvosRole) : "readonly";
}

export async function getVerifiedSession(): Promise<VvosSessionUser | null> {
  if (isLocalDemoAuthBypassAllowed()) return null;
  if (!adminAuth) return null;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("vvos_session")?.value;
  if (!sessionCookie) return null;

  try {
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      uid: claims.uid,
      email: typeof claims.email === "string" ? claims.email : null,
      role: resolveRole(claims),
      claims,
    };
  } catch {
    return null;
  }
}

export async function requireVerifiedSession(): Promise<VvosSessionUser | null> {
  if (isLocalDemoAuthBypassAllowed()) return null;
  const user = await getVerifiedSession();
  if (!user) redirect("/login?reason=session");
  return user;
}

export async function requireRole(roles: VvosRole[]): Promise<VvosSessionUser | null> {
  const user = await requireVerifiedSession();
  if (!user) return null;
  if (!roles.includes(user.role)) redirect("/dashboard?reason=forbidden");
  return user;
}
