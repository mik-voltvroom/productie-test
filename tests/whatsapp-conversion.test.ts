// @vitest-environment jsdom

import { act, createElement, Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingContactDock } from "@/components/FloatingContactDock";
import { MobileActionBar } from "@/components/MobileActionBar";
import { PublicAnalytics } from "@/components/PublicAnalytics";
import { GoogleTagManager } from "@/components/GoogleTagManager";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const consentKey = "vv_analytics_consent";
const containerId = "GTM-P2882R3H";
const whatsappSelectors = [
  [".floatingContactDock .contactActionWhatsapp", "floating dock"],
  [".mobileActionBar .contactActionWhatsapp", "mobile bar"],
  ["#plain-whatsapp", "ordinary WhatsApp link"],
] as const;

let root: Root;
let host: HTMLDivElement;

async function mount(consent: string | null) {
  if (consent !== null) localStorage.setItem(consentKey, consent);
  await act(async () => {
    root.render(createElement(Fragment, null,
      createElement(GoogleTagManager, { containerId }),
      createElement(PublicAnalytics),
      createElement(FloatingContactDock),
      createElement(MobileActionBar),
      createElement("a", { id: "plain-whatsapp", href: "https://wa.me/31646585468" },
        createElement("span", null, "WhatsApp")),
    ));
  });
}

async function click(selector: string) {
  const anchor = host.querySelector<HTMLAnchorElement>(selector);
  expect(anchor).not.toBeNull();
  // Click the nested icon/label so delegation through closest("a") is exercised.
  const target = anchor!.querySelector("svg path, span") || anchor!;
  await act(async () => {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function conversions() {
  return (window.dataLayer || []).filter((entry): entry is { event: string; href: string } =>
    typeof entry === "object" && entry !== null && "event" in entry &&
    (entry.event === "whatsapp_click" || entry.event === "chat_click"));
}

function gtmScripts() {
  return document.querySelectorAll('script[src^="https://www.googletagmanager.com/gtm.js"]');
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  delete window.dataLayer;
  host = document.createElement("div");
  document.body.appendChild(host);
  // Keep link navigation out of jsdom without stopping the analytics listener.
  host.addEventListener("click", event => event.preventDefault());
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  gtmScripts().forEach(script => script.remove());
  localStorage.clear();
  delete window.dataLayer;
  vi.unstubAllGlobals();
});

describe("WhatsApp conversion contract", () => {
  it.each(whatsappSelectors)("emits exactly one whatsapp_click from %s (%s)", async selector => {
    await mount("accepted");
    await click(selector);

    expect(conversions()).toEqual([{
      event: "whatsapp_click",
      href: host.querySelector(selector)!.getAttribute("href"),
    }]);
    expect(gtmScripts()).toHaveLength(1);
    expect(gtmScripts()[0].getAttribute("src")).toBe(
      "https://www.googletagmanager.com/gtm.js?id=GTM-P2882R3H",
    );
  });

  it.each([null, "rejected", "invalid"])(
    "does not load GTM or queue click events with consent %s",
    async consent => {
      await mount(consent);
      const initialLayer = [...(window.dataLayer || [])];
      for (const [selector] of whatsappSelectors) await click(selector);

      expect(conversions()).toEqual([]);
      // Consent commands may exist, but clicks must not add anything.
      expect(window.dataLayer).toEqual(initialLayer);
      expect(gtmScripts()).toHaveLength(0);
    },
  );

  it("starts measuring only after opt-in and never replays earlier clicks", async () => {
    await mount(null);
    for (const [selector] of whatsappSelectors) await click(selector);
    expect(gtmScripts()).toHaveLength(0);

    const accept = Array.from(host.querySelectorAll("button"))
      .find(button => button.textContent === "Analytics toestaan");
    expect(accept).toBeDefined();
    await act(async () => accept!.click());

    expect(localStorage.getItem(consentKey)).toBe("accepted");
    expect(gtmScripts()).toHaveLength(1);
    expect(conversions()).toEqual([]);
    for (const [selector] of whatsappSelectors) await click(selector);
    expect(conversions().map(entry => entry.event)).toEqual([
      "whatsapp_click", "whatsapp_click", "whatsapp_click",
    ]);
  });

  it("loads no GTM when the visitor chooses necessary cookies only", async () => {
    await mount(null);
    const reject = Array.from(host.querySelectorAll("button"))
      .find(button => button.textContent === "Alleen noodzakelijk");
    expect(reject).toBeDefined();
    await act(async () => reject!.click());
    const initialLayer = [...(window.dataLayer || [])];
    for (const [selector] of whatsappSelectors) await click(selector);

    expect(localStorage.getItem(consentKey)).toBe("rejected");
    expect(window.dataLayer).toEqual(initialLayer);
    expect(gtmScripts()).toHaveLength(0);
  });

  it("blocks subsequent WhatsApp events immediately after consent reset", async () => {
    await mount("accepted");
    await click(whatsappSelectors[0][0]);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("vv:consent-reset"));
    });
    expect(localStorage.getItem(consentKey)).toBeNull();
    const initialLayer = [...(window.dataLayer || [])];
    for (const [selector] of whatsappSelectors) await click(selector);

    expect(window.dataLayer).toEqual(initialLayer);
    expect(conversions()).toHaveLength(1);
  });

  it("removes the delegated click listener on unmount", async () => {
    await mount("accepted");
    const anchor = host.querySelector(".contactActionWhatsapp")!;
    document.body.appendChild(anchor);
    await act(async () => root.unmount());
    const initialLayer = [...(window.dataLayer || [])];
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(window.dataLayer).toEqual(initialLayer);
    anchor.remove();
    // Supply a fresh root for the shared cleanup.
    root = createRoot(host);
  });
});
