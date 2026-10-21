import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/session";
import { FinanceUnavailable } from "@/components/finance/FinanceUnavailable";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { bankTransactions, budgetLines, expenses, financeInvoices, inventoryFunding, kpiSnapshots, vehicleProfitability } from "@/lib/finance/sample-data";
export default async function FinancePage(){await requireRole(["owner","admin","finance","readonly"]); if (!isLocalDemoAuthBypassAllowed()) return <FinanceUnavailable/>; return <main className="dashboardPage container"><p role="status">Lokale demo — synthetische voorbeeldbedragen, geen bedrijfsresultaten.</p><div className="pageTitle"><div><span className="eyebrow">Finance & control</span><h1>De financiële cockpit van Volt & Vroom.</h1><p className="muted">Omzet, winst, liquiditeit, voorraad en risico in één bestuurbaar systeem.</p></div></div><FinanceDashboard invoices={financeInvoices} transactions={bankTransactions} expenses={expenses} funding={inventoryFunding} profitability={vehicleProfitability} budgets={budgetLines} kpis={kpiSnapshots}/></main>}
