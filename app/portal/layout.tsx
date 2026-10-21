import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo/business";
export const metadata: Metadata = { robots: privateRobots };
export default function PortalLayout({ children }: { children: React.ReactNode }) { return children; }
