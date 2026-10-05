"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function inferEvent(anchor: HTMLAnchorElement): string | null {
  if (anchor.dataset.vvEvent) return anchor.dataset.vvEvent;
  const href = anchor.getAttribute("href") || "";
  if (href.startsWith("tel:")) return "phone_click";
  if (href.startsWith("mailto:")) return "email_click";
  if (href.includes("google.com/maps/dir")) return "route_click";
  if (href.startsWith("/keuzehulp")) return "match_started";
  if (href.includes("#voorraad")) return "inventory_click";
  return null;
}

export function PublicAnalytics() {
  useEffect(() => {
    function push(eventName: string, detail: Record<string, unknown> = {}) {
      const payload = { event: eventName, ...detail };
      if (window.localStorage.getItem("vv_analytics_consent") === "accepted") {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(payload);
      }
      window.dispatchEvent(new CustomEvent("vv:analytics", { detail: payload }));
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const eventName = inferEvent(anchor);
      if (eventName) push(eventName, { href: anchor.getAttribute("href") || "" });
    }

    function handleLead(event: Event) {
      const customEvent = event as CustomEvent<Record<string, unknown>>;
      push("lead_submitted", customEvent.detail || {});
    }

    window.addEventListener("click", handleClick);
    window.addEventListener("vv:lead-submitted", handleLead);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("vv:lead-submitted", handleLead);
    };
  }, []);

  return null;
}
