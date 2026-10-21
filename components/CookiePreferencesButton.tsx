"use client";

export function CookiePreferencesButton() {
  return <button type="button" className="footerConsentButton" onClick={() => window.dispatchEvent(new Event("vv:consent-reset"))}>Cookie-instellingen</button>;
}
