import { CashflowCenter } from "@/components/finance/CashflowCenter";
import { bankTransactions, financeInvoices } from "@/lib/finance/sample-data";
export default function CashflowPage(){return <main className="dashboardPage container"><div className="pageTitle"><div><span className="eyebrow">Bank & matching</span><h1>Kasstromen</h1><p className="muted">Bankmutaties, automatische matching en directe grip op liquide middelen.</p></div></div><CashflowCenter initialTransactions={bankTransactions} invoices={financeInvoices}/></main>}
