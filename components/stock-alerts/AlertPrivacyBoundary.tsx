"use client";
import {usePathname} from "next/navigation";
import type {ReactNode} from "react";
/** Private/token pages never mount public analytics or third-party widgets. */
export function AlertPrivacyBoundary({children}:{children:ReactNode}) {
  const path = usePathname();
  return !path || /^\/(dashboard|portal|login|api|voorraadalert)(\/|$)/.test(path) ? null : <>{children}</>;
}
