import { InvoiceCenter } from "@/components/finance/InvoiceCenter";
import { financeInvoices } from "@/lib/finance/sample-data";
export default function InvoicesPage(){return <main className="dashboardPage container"><div className="pageTitle"><div><span className="eyebrow">Debiteuren & crediteuren</span><h1>Facturen</h1><p className="muted">Verkoop, inkoop, btw en betalingen per relatie en voertuig.</p></div></div><InvoiceCenter initialInvoices={financeInvoices}/></main>}
