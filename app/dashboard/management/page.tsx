import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/session";
import { FinanceUnavailable } from "@/components/finance/FinanceUnavailable";
import { ManagementControl } from "@/components/finance/ManagementControl";
import { budgetLines, kpiSnapshots, ledgerEntries } from "@/lib/finance/sample-data";
export default async function ManagementPage(){await requireRole(["owner","admin","finance","readonly"]); if (!isLocalDemoAuthBypassAllowed()) return <FinanceUnavailable/>; return <main className="dashboardPage container"><p role="status">Lokale demo — synthetische voorbeeldbedragen, geen bedrijfsresultaten.</p><div className="pageTitle"><div><span className="eyebrow">Directie</span><h1>Management control</h1><p className="muted">KPI's, budgetbewaking, risico's en een controleerbare audit trail.</p></div></div><ManagementControl snapshots={kpiSnapshots} budgets={budgetLines} ledger={ledgerEntries}/></main>}
