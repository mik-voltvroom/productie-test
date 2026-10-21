import { ManagementControl } from "@/components/finance/ManagementControl";
import { budgetLines, kpiSnapshots, ledgerEntries } from "@/lib/finance/sample-data";
export default function ManagementPage(){return <main className="dashboardPage container"><div className="pageTitle"><div><span className="eyebrow">Directie</span><h1>Management control</h1><p className="muted">KPI's, budgetbewaking, risico's en een controleerbare audit trail.</p></div></div><ManagementControl snapshots={kpiSnapshots} budgets={budgetLines} ledger={ledgerEntries}/></main>}
