import { notFound, redirect } from "next/navigation";
import { getPublicVehicleById, PublicInventoryUnavailable } from "@/lib/repositories/public-vehicle-repository";
import { publicVehicleHref } from "@/lib/vehicle-lookup/business";

export const dynamic = "force-dynamic";

/** Mobilox Vehicle Ads links use the external stock ID, not the editable slug. */
export default async function MobiloxVehiclePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!/^\d{1,20}$/.test(id)) notFound();
  const candidates = (await Promise.all([getPublicVehicleById(`hexon-${id}`), getPublicVehicleById(id)])).filter(vehicle => vehicle !== undefined);
  if (candidates.length > 1) throw new PublicInventoryUnavailable();
  const vehicle = candidates[0];
  if (!vehicle?.slug) notFound();
  redirect(publicVehicleHref(vehicle.slug, await searchParams));
}
