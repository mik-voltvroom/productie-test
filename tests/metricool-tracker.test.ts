// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.voltvroom.nl/"}

import { act, createElement, Fragment, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetricoolTracker } from "@/components/MetricoolTracker";
import { GoogleTagManager } from "@/components/GoogleTagManager";

vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));
const hash = "1a9fd44f75259f9967fa8c7dd6632954";
let root: Root;
let host: HTMLDivElement;
const scripts = () => document.querySelectorAll<HTMLScriptElement>("script[data-vv-metricool]");
async function render(trackerHash: string | undefined = hash) {
  await act(async () => root.render(createElement(StrictMode, null,
    createElement(Fragment, null,
      createElement(GoogleTagManager, { containerId: "GTM-TEST" }),
      createElement(MetricoolTracker, { hash: trackerHash }),
    ),
  )));
}
async function choose(label: string) {
  const button = [...host.querySelectorAll("button")].find(b => b.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
function loaded() {
  const t = vi.fn();
  window.beTracker = { t };
  scripts()[0].dispatchEvent(new Event("load"));
  return t;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  history.replaceState({}, "", "/");
  localStorage.clear();
  delete window.beTracker;
  delete window.dataLayer;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.querySelectorAll("script[data-vv-metricool],script[data-vv-gtm]").forEach(s => s.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Metricool consent and privacy", () => {
  it("loads once after acceptance and tracks client-side public navigation", async () => {
    await render();
    expect(scripts()).toHaveLength(0);
    await choose("Analytics toestaan");
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].src).toBe("https://tracker.metricool.com/resources/be.js");
    const t = loaded();
    expect(t).toHaveBeenCalledExactlyOnceWith({ hash });
    window.dispatchEvent(new Event("vv:consent-change"));
    expect(t).toHaveBeenCalledTimes(1);
    history.pushState({}, "", "/voorraad");
    await render();
    expect(scripts()).toHaveLength(1);
    expect(t).toHaveBeenCalledTimes(2);
    history.pushState({}, "", "/portal/private-token");
    await render();
    expect(t).toHaveBeenCalledTimes(2);
  });
  it("keeps the provider unloaded after rejection", async () => {
    await render();
    await choose("Alleen noodzakelijk");
    expect(scripts()).toHaveLength(0);
  });
  it("honours stored acceptance without duplicate calls in StrictMode", async () => {
    localStorage.setItem("vv_analytics_consent", "accepted");
    await render();
    expect(scripts()).toHaveLength(1);
    const t = loaded();
    expect(t).toHaveBeenCalledTimes(1);
  });
  it("rechecks consent if it is withdrawn while the script loads", async () => {
    localStorage.setItem("vv_analytics_consent", "accepted");
    await render();
    await act(async () => window.dispatchEvent(new Event("vv:consent-reset")));
    const t = loaded();
    expect(t).not.toHaveBeenCalled();
    await choose("Alleen noodzakelijk");
    history.pushState({}, "", "/contact");
    await render();
    expect(t).not.toHaveBeenCalled();
  });
  it.each(["/dashboard", "/dashboard/leads", "/login", "/portal/token", "/voorraadalert/bevestigen?token=private", "/contact?email=private", "/contact#private", "/unknown"]) (
    "excludes private or query-bearing URLs: %s", async url => {
      localStorage.setItem("vv_analytics_consent", "accepted");
      history.replaceState({}, "", url);
      await render();
      expect(scripts()).toHaveLength(0);
    },
  );
  it("excludes personal referrers", async () => {
    localStorage.setItem("vv_analytics_consent", "accepted");
    vi.spyOn(document, "referrer", "get").mockReturnValue("https://www.voltvroom.nl/portal/private-token");
    await render();
    expect(scripts()).toHaveLength(0);
  });
  it("does not load on a staging hostname", async () => {
    localStorage.setItem("vv_analytics_consent", "accepted");
    vi.spyOn(window, "location", "get").mockReturnValue(new URL("https://staging.voltvroom.nl/") as unknown as Location);
    await render();
    expect(scripts()).toHaveLength(0);
  });
  it("does not load when production configuration is absent", async () => {
    localStorage.setItem("vv_analytics_consent", "accepted");
    await render("");
    expect(scripts()).toHaveLength(0);
  });
  it("retries a failed script after a new consent notification", async () => {
    localStorage.setItem("vv_analytics_consent", "accepted");
    await render();
    scripts()[0].dispatchEvent(new Event("error"));
    expect(scripts()).toHaveLength(0);
    window.dispatchEvent(new Event("vv:consent-change"));
    expect(scripts()).toHaveLength(1);
    expect(loaded()).toHaveBeenCalledTimes(1);
  });
});
