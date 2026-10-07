import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import styles from "./Header.module.css";

const primaryLinks = [
  { href: "/voorraad", label: "Aanbod" },
  { href: "/inruilen", label: "Inruilen" },
  { href: "/kennis", label: "Kennis" },
  { href: "/contact", label: "Contact" },
];

const secondaryLinks = [
  { href: "/vv-verified", label: "Waarom V&V" },
  { href: "/hybride", label: "Hybride" },
  { href: "/elektrisch", label: "Elektrisch" },
  { href: "/icons", label: "Icons" },
  { href: "/uit-de-praktijk", label: "Uit de praktijk" },
];

const publicLinks = [
  primaryLinks[0],
  primaryLinks[1],
  secondaryLinks[0],
  secondaryLinks[1],
  secondaryLinks[2],
  secondaryLinks[3],
  primaryLinks[2],
  secondaryLinks[4],
  primaryLinks[3],
];

export function Header() {
  return <header className="siteHeader"><div className="container nav">
    <BrandLogo />
    <nav className="navlinks" aria-label="Hoofdnavigatie">
      {primaryLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
      <details className={styles.more}>
        <summary>Meer</summary>
        <div className={styles.moreMenu}>
          {secondaryLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
      </details>
    </nav>
    <Link href="/keuzehulp" className="button navCta" data-vv-event="match_started">Vind mijn auto</Link>
    <details className="mobileMenu"><summary aria-label="Open navigatiemenu"><span></span><span></span><span></span></summary><nav aria-label="Mobiele navigatie">
      {publicLinks.map((link) => <Link href={link.href} key={link.href}>{link.label === "Waarom V&V" ? "Waarom Volt & Vroom" : link.label}</Link>)}
      <Link href="/keuzehulp" data-vv-event="match_started">Vind mijn auto</Link>
      <a href="tel:+31646585468" data-vv-event="phone_click">Bel 0646585468</a>
    </nav></details>
  </div></header>;
}
