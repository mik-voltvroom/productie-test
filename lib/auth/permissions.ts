import type { VvosRole } from "@/lib/auth/session";

export type VvosPermission =
  | "dashboard.read"
  | "vehicles.read"
  | "vehicles.write"
  | "vehicles.internal.write"
  | "vehicles.soh.write"
  | "leads.read"
  | "leads.write"
  | "deals.read"
  | "deals.create"
  | "deals.changeStatus"
  | "delivery.write"
  | "payments.create"
  | "workshop.read"
  | "workshop.write"
  | "finance.read"
  | "finance.write"
  | "integrations.read"
  | "integrations.manage"
  | "audit.read"
  | "communications.send"
  | "socialVideos.read"
  | "socialVideos.write";

const rolePermissions: Record<VvosRole, ReadonlySet<VvosPermission>> = {
  owner: new Set<VvosPermission>([
    "dashboard.read", "vehicles.read", "vehicles.write", "vehicles.internal.write", "leads.read", "leads.write",
    "deals.read", "deals.create", "deals.changeStatus", "delivery.write", "payments.create", "workshop.read", "workshop.write", "finance.read",
    "finance.write", "integrations.read", "integrations.manage", "audit.read", "communications.send",
    "socialVideos.read", "socialVideos.write", "vehicles.soh.write",
  ]),
  admin: new Set<VvosPermission>([
    "dashboard.read", "vehicles.read", "vehicles.write", "vehicles.internal.write", "leads.read", "leads.write",
    "deals.read", "deals.create", "deals.changeStatus", "delivery.write", "payments.create", "workshop.read", "workshop.write", "finance.read",
    "finance.write", "integrations.read", "integrations.manage", "audit.read", "communications.send",
    "socialVideos.read", "socialVideos.write", "vehicles.soh.write",
  ]),
  sales: new Set<VvosPermission>([
    "dashboard.read", "vehicles.read", "vehicles.internal.write", "leads.read", "leads.write", "deals.read",
    "deals.create", "deals.changeStatus", "delivery.write", "payments.create", "communications.send", "socialVideos.read", "vehicles.soh.write",
  ]),
  marketing: new Set<VvosPermission>([
    "dashboard.read", "vehicles.read", "vehicles.write", "leads.read", "integrations.read",
    "socialVideos.read", "socialVideos.write",
  ]),
  workshop: new Set<VvosPermission>([
    "dashboard.read", "vehicles.read", "deals.read", "delivery.write", "workshop.read", "workshop.write", "socialVideos.read", "vehicles.soh.write",
  ]),
  finance: new Set<VvosPermission>([
    "dashboard.read", "vehicles.read", "deals.read", "payments.create", "finance.read", "finance.write", "audit.read",
  ]),
  readonly: new Set<VvosPermission>([
    "dashboard.read", "vehicles.read", "leads.read", "deals.read", "workshop.read", "finance.read",
  ]),
};

export function hasPermission(role: VvosRole, permission: VvosPermission): boolean {
  return rolePermissions[role].has(permission);
}

export function permissionsForRole(role: VvosRole): VvosPermission[] {
  return [...rolePermissions[role]];
}
