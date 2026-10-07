import { PhoneIcon, WhatsAppIcon } from "@/components/ContactActionIcon";
import { RouteIcon } from "@/components/RouteIcon";

export function FloatingContactDock() {
  const routeHref = "https://www.google.com/maps/dir/?api=1&destination=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&travelmode=driving";
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "31646585468").replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hallo Volt & Vroom, ik heb een vraag over jullie aanbod.")}`;

  return (
    <aside className="floatingContactDock" aria-label="Snel contact">
      <a className="contactAction contactActionPhone" href="tel:+31646585468" data-vv-event="phone_click" aria-label="Bel Volt & Vroom">
        <span className="dockIcon"><PhoneIcon /></span><span>Bel</span>
      </a>
      <a className="contactAction contactActionWhatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" data-vv-event="chat_click" aria-label="Stuur Volt & Vroom een WhatsApp-bericht">
        <span className="dockIcon"><WhatsAppIcon /></span><span>WhatsApp</span>
      </a>
      <a className="contactAction contactActionRoute" href={routeHref} target="_blank" rel="noopener noreferrer" data-vv-event="route_click" aria-label="Plan route naar Volt & Vroom">
        <span className="dockIcon"><RouteIcon /></span><span>Route</span>
      </a>
    </aside>
  );
}
