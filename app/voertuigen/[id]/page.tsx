import { notFound, redirect } from "next/navigation";
import { listPublicVehicles } from "@/lib/repositories/public-vehicle-repository";

export const dynamic = "force-dynamic";

/** Mobilox Vehicle Ads links use the external stock ID, not the editable slug. */
export default async function MobiloxVehiclePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!/^\d{1,20}$/.test(id)) notFound();
  const vehicles = await listPublicVehicles(100);
  // Resolve only website-published vehicles; never expose internal inventory.
  const vehicle = vehicles.find(item => item.id === `hexon-${id}` || item.id === id);
  if (!vehicle?.slug) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  const suffix = query.toString();
  redirect(`/voorraad/${encodeURIComponent(vehicle.slug)}${suffix ? `?${suffix}` : ""}`);
}
