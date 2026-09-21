import { BrandLogo } from "@/components/BrandLogo";

export function SiteFooter() {
  const routeHref = "https://www.google.com/maps/dir/?api=1&destination=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&travelmode=driving";
  const mapHref = "https://www.google.com/maps?q=Euvelgunnerweg%2050%2C%209723%20CW%20Groningen&output=embed";

  return <footer className="siteFooter">
    <div className="container footerTop">
      <div><BrandLogo dark /><p>Slim rijden. Meer genieten.</p></div>
      <div><strong>Ontdek</strong><a href="/hybride">Hybride</a><a href="/elektrisch">Elektrisch</a><a href="/icons">Icons</a><a href="/#voorraad">Aanbod</a><a href="/uit-de-praktijk">Uit de praktijk</a></div>
      <div><strong>Kennis &amp; advies</strong><a href="/kennis">Alle artikelen</a><a href="/kennis/elektrische-occasion-kopen-controlepunten">Elektrische occasion kopen</a><a href="/kennis/soh-accu-elektrische-auto-uitleg">SOH en accugezondheid</a><a href="/kennis/hybride-of-elektrisch-wat-past-bij-mij">Hybride of elektrisch</a></div>
      <div><strong>Zekerheid</strong><a href="/vv-verified">VV Verified</a><a href="/inruilen">Auto inruilen</a><a href="/keuzehulp" data-vv-event="match_started">Hybrid &amp; EV Match</a><a href="/contact">Contact &amp; route</a></div>
      <div className="footerContact">
        <strong>Contact</strong>
        <a href="tel:+31611669111" data-vv-event="phone_click">0611669111</a>
        <a href="mailto:sales@voltvroom.nl" data-vv-event="email_click">sales@voltvroom.nl</a>
        <span>Euvelgunnerweg 50</span>
        <span>9723 CW Groningen</span>
        <div className="footerMap"><iframe src={mapHref} title="Kaart met de locatie van Volt & Vroom in Groningen" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        <a className="footerRouteLink" href={routeHref} target="_blank" rel="noopener noreferrer" aria-label="Plan uw route naar Volt & Vroom via Google Maps" data-vv-event="route_click">Plan route via Google Maps ↗</a>
      </div>
    </div>
    <div className="container footerBottom"><span>© 2026 Volt &amp; Vroom</span><div><a href="/privacy">Privacy</a><a href="/login">VVOS-login</a></div></div>
  </footer>;
}
