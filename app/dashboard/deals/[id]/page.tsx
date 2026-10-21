export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { DealWorkspace } from "@/components/deals/DealWorkspace";
import { getDealBundle } from "@/lib/deal/repository";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getDealBundle(id).catch(() => null);
  if (!bundle) notFound();
  return <main className="dashboardPage container"><DealWorkspace deal={bundle.deal} initialTasks={bundle.tasks} payments={bundle.payments} documents={bundle.documents} finance={bundle.finance} /></main>;
}
