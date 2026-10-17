"use client";

import { useEffect, useState } from "react";
import styles from "./GoogleTagManager.module.css";

const CONSENT_KEY = "vv_analytics_consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function pushConsent(command: "default" | "update", analyticsStorage: "denied" | "granted") {
  window.dataLayer = window.dataLayer || [];
  function gtag(..._args: unknown[]) {
    window.dataLayer?.push(arguments);
  }
  gtag("consent", command, {
    analytics_storage: analyticsStorage,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    ...(command === "default" ? { wait_for_update: 500 } : {}),
  });
}

function enableGoogleTagManager(containerId: string) {
  if (document.querySelector(`script[data-vv-gtm="${containerId}"]`)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  script.dataset.vvGtm = containerId;
  document.head.appendChild(script);
}

export function GoogleTagManager({ containerId }: { containerId?: string }) {
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    if (!containerId || window.location.pathname.startsWith("/voorraadalert/")) return;
    pushConsent("default", "denied");
    const storedConsent = window.localStorage.getItem(CONSENT_KEY);
    if (storedConsent === "accepted" || storedConsent === "rejected") {
      setConsent(storedConsent);
      if (storedConsent === "accepted") {
        pushConsent("update", "granted");
        enableGoogleTagManager(containerId);
      }
    }

    function resetConsent() {
      window.localStorage.removeItem(CONSENT_KEY);
      pushConsent("update", "denied");
      setConsent(null);
    }

    window.addEventListener("vv:consent-reset", resetConsent);
    return () => window.removeEventListener("vv:consent-reset", resetConsent);
  }, [containerId]);

  if (!containerId) return null;

  function chooseConsent(choice: "accepted" | "rejected") {
    window.localStorage.setItem(CONSENT_KEY, choice);
    setConsent(choice);
    pushConsent("update", choice === "accepted" ? "granted" : "denied");
    if (choice === "accepted") enableGoogleTagManager(containerId!);
  }

  return (
    <>
      {consent === null && (
        <aside className={styles.banner} aria-label="Cookievoorkeuren">
          <div>
            <strong>Helpt u ons de website te verbeteren?</strong>
            <p>
              Met uw toestemming gebruiken we Google Analytics om op hoofdlijnen te begrijpen hoe de website wordt gebruikt. Advertentiepersonalisatie blijft uitgeschakeld. Lees meer in ons <a href="/privacy">privacybeleid</a>.
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => chooseConsent("rejected")}>Alleen noodzakelijk</button>
            <button type="button" className={styles.primary} onClick={() => chooseConsent("accepted")}>Analytics toestaan</button>
          </div>
        </aside>
      )}
    </>
  );
}
