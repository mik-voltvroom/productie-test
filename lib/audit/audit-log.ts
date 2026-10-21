import { adminDb } from "@/lib/firebase-admin";
import type { ApiActor } from "@/lib/auth/api";

export type AuditOutcome = "success" | "warning" | "failed";

export interface AuditEventInput {
  action: string;
  entityType: string;
  entityId?: string;
  actor?: ApiActor | null;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown>;
  request?: Request;
}

export interface AuditEvent extends Omit<AuditEventInput, "request" | "actor"> {
  id: string;
  actor: ApiActor | null;
  createdAt: string;
  ipHash?: string;
  userAgent?: string;
}

const demoEvents: AuditEvent[] = [];

async function hashIp(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${process.env.AUDIT_HASH_SALT ?? "vvos-demo"}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function writeAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  const forwarded = input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actor: input.actor ?? null,
    outcome: input.outcome ?? "success",
    metadata: sanitizeMetadata(input.metadata ?? {}),
    createdAt: new Date().toISOString(),
    ipHash: forwarded ? await hashIp(forwarded) : undefined,
    userAgent: input.request?.headers.get("user-agent")?.slice(0, 240) ?? undefined,
  };

  if (adminDb && process.env.VVOS_DATA_MODE === "firebase") {
    await adminDb.collection("audit_logs").doc(event.id).set(event);
  } else {
    demoEvents.unshift(event);
    demoEvents.splice(100);
    console.info("[VVOS:AUDIT]", JSON.stringify(event));
  }
  return event;
}

export async function listAuditEvents(limit = 50): Promise<AuditEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  if (adminDb && process.env.VVOS_DATA_MODE === "firebase") {
    const snapshot = await adminDb.collection("audit_logs").orderBy("createdAt", "desc").limit(safeLimit).get();
    return snapshot.docs.map((doc) => doc.data() as AuditEvent);
  }
  return demoEvents.slice(0, safeLimit);
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const forbidden = /(token|secret|password|authorization|cookie|api[-_]?key)/i;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, forbidden.test(key) ? "[REDACTED]" : value]),
  );
}
