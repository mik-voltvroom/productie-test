import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/session";
import { FinanceUnavailable } from "@/components/finance/FinanceUnavailable";
import { CashflowCenter } from "@/components/finance/CashflowCenter";
import { bankTransactions, financeInvoices } from "@/lib/finance/sample-data";
export default async function CashflowPage(){await requireRole(["owner","admin","finance","readonly"]); if (!isLocalDemoAuthBypassAllowed()) return <FinanceUnavailable/>; return <main className="dashboardPage container"><p role="status">Lokale demo — synthetische voorbeeldbedragen, geen bedrijfsresultaten.</p><div className="pageTitle"><div><span className="eyebrow">Bank & matching</span><h1>Kasstromen</h1><p className="muted">Bankmutaties, automatische matching en directe grip op liquide middelen.</p></div></div><CashflowCenter initialTransactions={bankTransactions} invoices={financeInvoices}/></main>}
