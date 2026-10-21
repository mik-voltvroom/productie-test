import type { WarrantyClaim, WorkOrder } from "@/types";

export function workOrderProgress(order: WorkOrder) {
  if (!order.tasks.length) return 0;
  const score = order.tasks.reduce((sum, task) => sum + (task.status === "done" ? 1 : task.status === "in_progress" ? .5 : 0), 0);
  return Math.round((score / order.tasks.length) * 100);
}

export function workOrderFinancials(order: WorkOrder) {
  const partsCost = order.parts.reduce((s, p) => s + p.purchasePriceEur * p.quantity, 0);
  const partsRevenue = order.parts.reduce((s, p) => s + p.salePriceEur * p.quantity, 0);
  const laborMinutes = order.tasks.reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0);
  const laborRevenue = laborMinutes / 60 * 89;
  return { partsCost, partsRevenue, laborMinutes, laborRevenue, estimatedInvoice: partsRevenue + laborRevenue, grossContribution: partsRevenue + laborRevenue - partsCost };
}

export function workshopMetrics(orders: WorkOrder[]) {
  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const waiting = active.filter(o => o.status === "waiting_approval").length;
  const urgent = active.filter(o => o.priority === "urgent" || o.priority === "high").length;
  const soldHours = active.reduce((s, o) => s + o.tasks.reduce((x, t) => x + t.estimatedMinutes, 0), 0) / 60;
  return { active: active.length, waiting, urgent, soldHours: Math.round(soldHours * 10) / 10 };
}

export function claimExposure(claims: WarrantyClaim[]) {
  return claims.filter(c => !["completed", "rejected"].includes(c.status)).reduce((s, c) => s + Math.max(c.estimatedCostEur - c.customerContributionEur - c.supplierContributionEur, 0), 0);
}
