"use client";

import { useEffect, useState } from "react";
import styles from "./GoogleAnalytics.module.css";

const CONSENT_KEY = "vv_analytics_consent";

function enableGoogleAnalytics(measurementId: string) {
  if (document.querySelector(`script[data-vv-ga="${measurementId}"]`)) return;

  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  gtag("js", new Date());
  gtag("config", measurementId, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.vvGa = measurementId;
  document.head.appendChild(script);
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    if (!measurementId) return;
    const storedConsent = window.localStorage.getItem(CONSENT_KEY);
    if (storedConsent === "accepted" || storedConsent === "rejected") {
      setConsent(storedConsent);
      if (storedConsent === "accepted") enableGoogleAnalytics(measurementId);
    }
  }, [measurementId]);

  if (!measurementId || consent !== null) return null;

  function chooseConsent(choice: "accepted" | "rejected") {
    window.localStorage.setItem(CONSENT_KEY, choice);
    setConsent(choice);
    if (choice === "accepted") enableGoogleAnalytics(measurementId!);
  }

  return (
    <aside className={styles.banner} aria-label="Cookievoorkeuren">
      <div>
        <strong>Helpt u ons de website te verbeteren?</strong>
        <p>
          Met uw toestemming gebruiken we Google Analytics om op hoofdlijnen te begrijpen hoe de website wordt gebruikt. Lees meer in ons <a href="/privacy">privacybeleid</a>.
        </p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => chooseConsent("rejected")}>Alleen noodzakelijk</button>
        <button type="button" className={styles.primary} onClick={() => chooseConsent("accepted")}>Analytics toestaan</button>
      </div>
    </aside>
  );
}
