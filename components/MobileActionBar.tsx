"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5 9 7.9 7.4 9.5a15 15 0 0 0 7.1 7.1l1.6-1.6 4.4 2.4-.7 2.7c-.2.8-.9 1.4-1.8 1.4C9.5 21.5 2.5 14.5 2.5 6c0-.9.6-1.6 1.4-1.8l2.7-.7Z" /></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4.1Z" /><path d="M8.4 7.6c.3-.3.6-.3.8.1l1 2c.1.3.1.5-.1.7l-.7.8c.8 1.7 2 2.9 3.7 3.7l.8-.7c.2-.2.5-.2.7-.1l2 1c.4.2.4.5.1.8-.6.8-1.5 1.2-2.4 1.1-3.7-.5-6.7-3.5-7.2-7.2-.1-.9.3-1.8 1.3-2.2Z" /></svg>;
}

function RouteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 16-16-5.2 14.2-3.2-5.8L4 20Z" /></svg>;
}

export function MobileActionBar() {
  const routeHref = "https://www.google.com/maps/dir/?api=1&destination=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&travelmode=driving";
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "31611669111").replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hallo Volt & Vroom, ik heb een vraag over jullie aanbod.")}`;
  const pathname = usePathname();
  const [formInView, setFormInView] = useState(false);

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

  return <div className={`mobileActionBar${formInView ? " isHidden" : ""}`} aria-label="Snelle acties" aria-hidden={formInView || undefined}>
    <a className="contactAction contactActionPhone" href="tel:+31646585468" data-vv-event="phone_click" aria-label="Bel Volt & Vroom"><PhoneIcon /><span>Bel</span></a>
    <a className="contactAction contactActionWhatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" data-vv-event="chat_click" aria-label="Stuur Volt & Vroom een WhatsApp-bericht"><WhatsAppIcon /><span>WhatsApp</span></a>
    <a className="contactAction contactActionRoute" href={routeHref} target="_blank" rel="noopener noreferrer" data-vv-event="route_click" aria-label="Plan route naar Volt & Vroom"><RouteIcon /><span>Route</span></a>
  </div>;
}
