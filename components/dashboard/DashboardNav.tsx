import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
export function DashboardNav() {
  return <header className="dashboardHeader"><div className="dashboardNav container">
    <div className="dashboardBrand"><BrandLogo href="/dashboard"/><small>VVOS</small></div>
    <nav aria-label="VVOS hoofdnavigatie">
      <Link href="/dashboard">Overzicht</Link>
      <Link href="/dashboard/voorraad">Voorraad</Link>
      <Link href="/dashboard/voertuigcheck">Voertuigcheck</Link>
      <Link href="/dashboard/leads">Leads</Link>
      <Link href="/dashboard/social-video">Social &amp; Video</Link>
      <Link href="/dashboard/werkplaats">Werkplaats</Link>
      <Link href="/dashboard/finance">Finance</Link>
      <Link href="/dashboard/management">Management</Link>
      <Link href="/dashboard/integraties">Integraties</Link>
      <Link href="/" target="_blank">Website <span aria-hidden="true">↗</span></Link>
      <details className="dashboardMore">
        <summary>Meer</summary>
        <div>
          <Link href="/dashboard/afspraken">Afspraken</Link>
          <Link href="/dashboard/offertes">Offertes</Link>
          <Link href="/dashboard/afleveringen">Afleveringen</Link>
          <Link href="/dashboard/garantie">Garantie</Link>
          <Link href="/dashboard/facturen">Facturen</Link>
          <Link href="/dashboard/kasstromen">Kasstromen</Link>
          <Link href="/dashboard/voorraadfinanciering">Financiering</Link>
          <Link href="/dashboard/klantportaal">Klantportaal</Link>
          <Link href="/dashboard/automatisering">Automation</Link>
          <Link href="/dashboard/audit">Audit</Link>
          <Link href="/dashboard/seo">SEO</Link>
        </div>
      </details>
    </nav>
  </div></header>;
}
