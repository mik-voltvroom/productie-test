import { FundingCenter } from "@/components/finance/FundingCenter";
import { inventoryFunding, vehicleProfitability } from "@/lib/finance/sample-data";
export default function FundingPage(){return <main className="dashboardPage container"><div className="pageTitle"><div><span className="eyebrow">Kapitaalbeslag</span><h1>Voorraadfinanciering</h1><p className="muted">Hoofdsom, rente, voorraaddagen en marge per gefinancierde auto.</p></div></div><FundingCenter funding={inventoryFunding} profitability={vehicleProfitability}/></main>}
