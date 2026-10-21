import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/session";
import { FinanceUnavailable } from "@/components/finance/FinanceUnavailable";
import { FundingCenter } from "@/components/finance/FundingCenter";
import { inventoryFunding, vehicleProfitability } from "@/lib/finance/sample-data";
export default async function FundingPage(){await requireRole(["owner","admin","finance","readonly"]); if (!isLocalDemoAuthBypassAllowed()) return <FinanceUnavailable/>; return <main className="dashboardPage container"><p role="status">Lokale demo — synthetische voorbeeldbedragen, geen bedrijfsresultaten.</p><div className="pageTitle"><div><span className="eyebrow">Kapitaalbeslag</span><h1>Voorraadfinanciering</h1><p className="muted">Hoofdsom, rente, voorraaddagen en marge per gefinancierde auto.</p></div></div><FundingCenter funding={inventoryFunding} profitability={vehicleProfitability}/></main>}
