import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/session";
import { FinanceUnavailable } from "@/components/finance/FinanceUnavailable";
import { InvoiceCenter } from "@/components/finance/InvoiceCenter";
import { financeInvoices } from "@/lib/finance/sample-data";
export default async function InvoicesPage(){await requireRole(["owner","admin","finance","readonly"]); if (!isLocalDemoAuthBypassAllowed()) return <FinanceUnavailable/>; return <main className="dashboardPage container"><p role="status">Lokale demo — synthetische voorbeeldbedragen, geen bedrijfsresultaten.</p><div className="pageTitle"><div><span className="eyebrow">Debiteuren & crediteuren</span><h1>Facturen</h1><p className="muted">Verkoop, inkoop, btw en betalingen per relatie en voertuig.</p></div></div><InvoiceCenter initialInvoices={financeInvoices}/></main>}
