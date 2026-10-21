"use client";
import {usePathname} from "next/navigation";
import type {ReactNode} from "react";
/** Personal token pages never load third-party widgets, including merchant scripts. */
export function AlertPrivacyBoundary({children}:{children:ReactNode}){const path=usePathname();return path?.startsWith("/voorraadalert/")||path?.startsWith("/dashboard/voorraadalerts")?null:<>{children}</>;}
