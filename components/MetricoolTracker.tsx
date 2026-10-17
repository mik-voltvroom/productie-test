"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    beTracker?: { t: (options: { hash: string }) => void };
  }
}

// The provider reads the full URL and referrer itself. Never load it for private
// routes or URLs carrying queries/fragments, which may contain personal tokens.
const publicPath = /^\/(?:$|(?:contact|elektrisch|hybride|auto-inruilen-groningen|elektrische-auto-kopen-groningen|hybride-auto-kopen-groningen|inruilen|keuzehulp|privacy|vv-verified)\/?$|(?:voorraad|voertuigen|kennis|uit-de-praktijk)(?:\/[^/]+)?\/?$)/;

function mayTrack() {
  if (!["voltvroom.nl", "www.voltvroom.nl"].includes(window.location.hostname)) return false;
  if (!publicPath.test(window.location.pathname) || window.location.search || window.location.hash) return false;
  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.search || referrer.hash) return false;
      if (["voltvroom.nl", "www.voltvroom.nl"].includes(referrer.hostname) && !publicPath.test(referrer.pathname)) return false;
    } catch { return false; }
  }
  try { return window.localStorage.getItem("vv_analytics_consent") === "accepted"; }
  catch { return false; }
}

export function MetricoolTracker({ hash }: { hash?: string }) {
  const pathname = usePathname();
  const lastTrackedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!hash || !/^[a-f0-9]{32}$/i.test(hash)) return;
    let pendingScript: HTMLScriptElement | null = null;

    function track() {
      if (!mayTrack() || !window.beTracker || lastTrackedUrl.current === window.location.href) return;
      window.beTracker.t({ hash: hash! });
      lastTrackedUrl.current = window.location.href;
    }

    function enable() {
      if (!mayTrack()) return;
      if (window.beTracker) { track(); return; }
      if (pendingScript) return;
      let script = document.querySelector<HTMLScriptElement>("script[data-vv-metricool]");
      const isNew = !script;
      if (!script) {
        script = document.createElement("script");
        script.async = true;
        script.src = "https://tracker.metricool.com/resources/be.js";
        script.dataset.vvMetricool = "true";
      }
      pendingScript = script;
      script.addEventListener("load", track);
      script.addEventListener("error", failed);
      if (isNew) document.head.appendChild(script);
    }

    function failed() {
      pendingScript?.removeEventListener("load", track);
      pendingScript?.removeEventListener("error", failed);
      pendingScript?.remove();
      pendingScript = null;
    }

    enable();
    window.addEventListener("vv:consent-change", enable);
    return () => {
      window.removeEventListener("vv:consent-change", enable);
      pendingScript?.removeEventListener("load", track);
      pendingScript?.removeEventListener("error", failed);
    };
  }, [hash, pathname]);

  return null;
}
