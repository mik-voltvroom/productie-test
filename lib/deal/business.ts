import type { Deal, DeliveryTask } from "@/types";

export function dealProgress(deal: Deal, tasks: DeliveryTask[]) {
  const dealTasks = tasks.filter((task) => task.dealId === deal.id);
  if (!dealTasks.length) return 0;
  return Math.round((dealTasks.filter((task) => task.status === "done").length / dealTasks.length) * 100);
}

export function openBalanceCents(deal: Deal, paidAmountCents: number) {
  return Math.max(0, deal.totalCents - paidAmountCents);
}

export function canDeliver(deal: Deal, tasks: DeliveryTask[], openAmountCents: number) {
  return deal.registrationStatus === "completed" && openAmountCents === 0 && tasks.filter((task) => task.dealId === deal.id).every((task) => task.status === "done");
}
