"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PhoneIcon, WhatsAppIcon } from "@/components/ContactActionIcon";
import { RouteIcon } from "@/components/RouteIcon";

type RouteAppId = "google" | "apple" | "waze";

const routePreferenceKey = "vv_preferred_route_app";
const routeOptions: Array<{ id: RouteAppId; label: string; description: string; href: string }> = [
  {
    id: "google",
    label: "Google Maps",
    description: "Route in Google Maps",
    href: "https://www.google.com/maps/dir/?api=1&destination=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&travelmode=driving",
  },
  {
    id: "apple",
    label: "Apple Kaarten",
    description: "Route in Apple Kaarten",
    href: "https://maps.apple.com/?daddr=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&dirflg=d",
  },
  {
    id: "waze",
    label: "Waze",
    description: "Route in Waze",
    href: "https://www.waze.com/ul?q=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&navigate=yes",
  },
];

export function MobileActionBar() {
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "31646585468").replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hallo Volt & Vroom, ik heb een vraag over jullie aanbod.")}`;
  const pathname = usePathname();
  const [formInView, setFormInView] = useState(false);
  const [routeChooserOpen, setRouteChooserOpen] = useState(false);
  const [preferredRouteApp, setPreferredRouteApp] = useState<RouteAppId | null>(null);
  const routeTriggerRef = useRef<HTMLButtonElement>(null);
  const routeChooserRef = useRef<HTMLElement>(null);
  const firstRouteOptionRef = useRef<HTMLAnchorElement>(null);

  const closeRouteChooser = useCallback(() => {
    setRouteChooserOpen(false);
    requestAnimationFrame(() => routeTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const form = document.querySelector(".contactForm, [data-mobile-action-anchor]");
    if (!form) {
      setFormInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setFormInView(entry.isIntersecting),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!routeChooserOpen) return;

    try {
      const storedPreference = window.localStorage.getItem(routePreferenceKey);
      if (storedPreference === "google" || storedPreference === "apple" || storedPreference === "waze") {
        setPreferredRouteApp(storedPreference);
      }
    } catch {
      // Navigation remains available when browser storage is blocked.
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => firstRouteOptionRef.current?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeRouteChooser();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(routeChooserRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") || []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeRouteChooser, routeChooserOpen]);

  function rememberRouteApp(id: RouteAppId) {
    try {
      window.localStorage.setItem(routePreferenceKey, id);
    } catch {
      // The selected route app still opens when browser storage is blocked.
    }
    setPreferredRouteApp(id);
    setRouteChooserOpen(false);
  }

  return <>
    <div className={`mobileActionBar${formInView ? " isHidden" : ""}`} aria-label="Snelle acties" aria-hidden={formInView || undefined}>
      <a className="contactAction contactActionPhone" href="tel:+31646585468" data-vv-event="phone_click" aria-label="Bel Volt & Vroom"><span className="contactActionIcon"><PhoneIcon /></span><span>Bel</span></a>
      <a className="contactAction contactActionWhatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" data-vv-event="whatsapp_click" aria-label="Stuur Volt & Vroom een WhatsApp-bericht"><span className="contactActionIcon"><WhatsAppIcon /></span><span>WhatsApp</span></a>
      <button ref={routeTriggerRef} className="contactAction contactActionRoute" type="button" aria-label="Kies een navigatie-app voor de route naar Volt & Vroom" aria-haspopup="dialog" aria-expanded={routeChooserOpen} aria-controls="mobile-route-chooser" onClick={() => setRouteChooserOpen(true)}><span className="routeActionIcon"><RouteIcon /></span><span>Route</span></button>
    </div>
    {routeChooserOpen && <>
      <button className="routeChooserBackdrop" type="button" aria-label="Routekeuze sluiten" onClick={closeRouteChooser} />
      <section ref={routeChooserRef} id="mobile-route-chooser" className="routeChooserSheet" role="dialog" aria-modal="true" aria-labelledby="route-chooser-title">
        <header className="routeChooserHeader">
          <div><span>ROUTE NAAR VOLT &amp; VROOM</span><h2 id="route-chooser-title">Kies uw navigatie-app</h2></div>
          <button className="routeChooserClose" type="button" onClick={closeRouteChooser}>Sluiten</button>
        </header>
        <p>Uw laatste keuze wordt alleen op dit apparaat onthouden.</p>
        <div className="routeChooserOptions">
          {routeOptions.map((option, index) => <a
            key={option.id}
            ref={index === 0 ? firstRouteOptionRef : undefined}
            className={`routeChoice${preferredRouteApp === option.id ? " isPreferred" : ""}`}
            href={option.href}
            target="_blank"
            rel="noopener noreferrer"
            data-vv-event="route_click"
            data-route-provider={option.id}
            onClick={() => rememberRouteApp(option.id)}
          >
            <span><strong>{option.label}</strong><small>{option.description}</small></span>
            {preferredRouteApp === option.id && <em>Laatst gebruikt</em>}
          </a>)}
        </div>
      </section>
    </>}
  </>;
}
