export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo/business";
export const metadata: Metadata = { robots: privateRobots };

import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { requireVerifiedSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireVerifiedSession();
  return (
    <>
      <DashboardNav />
      {children}
    </>
  );
}
