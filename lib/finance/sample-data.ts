import type { BankTransaction, BudgetLine, Expense, InventoryFunding, Invoice, LedgerEntry, ManagementKpiSnapshot, VehicleProfitability } from "@/types";
import { invoiceTotals, vehicleProfit } from "./business";

const salesLines=[{id:"l1",description:"Toyota Corolla Touring Sports 1.8 Hybrid",quantity:1,unitPriceCents:2392500,vatPercent:0,accountCode:"8000",vehicleId:"VV-2026-1001"},{id:"l2",description:"Volt Care Plus afleverpakket",quantity:1,unitPriceCents:98760,vatPercent:21,accountCode:"8100"}];
const purchaseLines=[{id:"p1",description:"Werkplaatsdelen en onderhoud",quantity:1,unitPriceCents:68500,vatPercent:21,accountCode:"4400",vehicleId:"VV-2026-1003"}];
const t1=invoiceTotals(salesLines),t2=invoiceTotals(purchaseLines);
export const financeInvoices:Invoice[]=[
{id:"INV-2026-0042",number:"VV-2026-0042",kind:"sales",status:"partially_paid",customerOrSupplier:"Sanne de Vries",email:"sanne@example.nl",invoiceDate:"2026-07-08",dueDate:"2026-07-15",lines:salesLines,...t1,paidCents:500000,dealId:"DEAL-0042",vehicleId:"VV-2026-1001",paymentReference:"VV0042",createdAt:"2026-07-08T09:00:00Z",updatedAt:"2026-07-13T11:00:00Z"},
{id:"INV-2026-0041",number:"VV-2026-0041",kind:"sales",status:"paid",customerOrSupplier:"Mark Jansen",invoiceDate:"2026-07-02",dueDate:"2026-07-02",lines:[{id:"l3",description:"Kia Niro Hybrid DynamicLine",quantity:1,unitPriceCents:2145000,vatPercent:0}],subtotalCents:2145000,vatCents:0,totalCents:2145000,paidCents:2145000,vehicleId:"VV-2026-1002",createdAt:"2026-07-02T08:00:00Z",updatedAt:"2026-07-02T14:00:00Z"},
{id:"PINV-2026-0188",number:"F-581942",kind:"purchase",status:"sent",customerOrSupplier:"Fource Automotive",invoiceDate:"2026-07-10",dueDate:"2026-08-09",lines:purchaseLines,...t2,paidCents:0,vehicleId:"VV-2026-1003",createdAt:"2026-07-10T08:00:00Z",updatedAt:"2026-07-10T08:00:00Z"}
];
export const bankTransactions:BankTransaction[]=[
{id:"BT-01",bookedAt:"2026-07-13",amountCents:500000,description:"Aanbetaling auto VV0042",counterparty:"S. de Vries",reference:"VV0042",matchedInvoiceId:"INV-2026-0042",category:"vehicle_sales",status:"matched"},
{id:"BT-02",bookedAt:"2026-07-12",amountCents:-150000,description:"Huur Euvelgunnerweg",counterparty:"Vastgoed Groningen",category:"rent",status:"matched"},
{id:"BT-03",bookedAt:"2026-07-11",amountCents:-73520,description:"Fource factuur 581942",counterparty:"Fource Automotive",reference:"581942",category:"inventory",status:"suggested"},
{id:"BT-04",bookedAt:"2026-07-10",amountCents:119500,description:"Garantiepakket klant",counterparty:"M. Jansen",category:"warranty",status:"unmatched"}
];
export const expenses:Expense[]=[
{id:"EXP-01",supplier:"Vastgoed Groningen",bookedAt:"2026-07-01",dueDate:"2026-07-01",description:"Huur showroom en werkplaats",category:"rent",netEur:1500,vatPercent:21,vatEur:315,grossEur:1815,status:"paid"},
{id:"EXP-02",supplier:"Google Ads",bookedAt:"2026-07-12",description:"Vehicle Ads en Search",category:"marketing",netEur:750,vatPercent:21,vatEur:157.5,grossEur:907.5,status:"approved"},
{id:"EXP-03",supplier:"Garantiefonds intern",bookedAt:"2026-07-13",description:"Maandelijkse garantiereservering",category:"warranty",netEur:1600,vatPercent:0,vatEur:0,grossEur:1600,status:"scheduled"}
];
export const inventoryFunding:InventoryFunding[]=[
{id:"FUND-01",vehicleId:"VV-2026-1001",provider:"DFM Voorraadfinanciering",principalEur:19250,interestRatePercent:8.4,startDate:"2026-05-02",accruedInterestEur:325.54,feesEur:95,status:"active"},
{id:"FUND-02",vehicleId:"VV-2026-1002",provider:"Eigen middelen",principalEur:17800,interestRatePercent:0,startDate:"2026-06-14",accruedInterestEur:0,feesEur:0,status:"released",releasedAt:"2026-07-02"},
{id:"FUND-03",vehicleId:"VV-2026-1003",provider:"DFM Voorraadfinanciering",principalEur:26850,interestRatePercent:8.4,startDate:"2026-04-20",accruedInterestEur:531.22,feesEur:95,status:"active"}
];
export const vehicleProfitability:VehicleProfitability[]=[
vehicleProfit({vehicleId:"VV-2026-1001",vehicleLabel:"Toyota Corolla TS Hybrid",salePriceEur:24920,purchasePriceEur:19250,directCostsEur:1540,financeCostsEur:420.54,warrantyProvisionEur:350,tradeInMarginEur:900,upsellMarginEur:610,stockDays:72}),
vehicleProfit({vehicleId:"VV-2026-1002",vehicleLabel:"Kia Niro Hybrid",salePriceEur:21450,purchasePriceEur:17800,directCostsEur:1225,financeCostsEur:0,warrantyProvisionEur:300,tradeInMarginEur:0,upsellMarginEur:520,stockDays:18}),
vehicleProfit({vehicleId:"VV-2026-1003",vehicleLabel:"Lexus NX 300h",salePriceEur:31950,purchasePriceEur:26850,directCostsEur:1820,financeCostsEur:626.22,warrantyProvisionEur:500,tradeInMarginEur:1250,upsellMarginEur:750,stockDays:85})
];
export const budgetLines:BudgetLine[]=[
{id:"B1",month:"2026-07",category:"vehicle_sales",budgetEur:180000,actualEur:147800,forecastEur:194000},{id:"B2",month:"2026-07",category:"workshop",budgetEur:26000,actualEur:21450,forecastEur:28750},{id:"B3",month:"2026-07",category:"marketing",budgetEur:3000,actualEur:2480,forecastEur:3310},{id:"B4",month:"2026-07",category:"payroll",budgetEur:22000,actualEur:11000,forecastEur:22000},{id:"B5",month:"2026-07",category:"rent",budgetEur:1815,actualEur:1815,forecastEur:1815}
];
export const kpiSnapshots:ManagementKpiSnapshot[]=[
{period:"2026-05",revenueEur:162400,grossProfitEur:29450,operatingExpensesEur:18300,ebitdaEur:11150,cashEur:64200,receivablesEur:18400,payablesEur:22750,inventoryBookValueEur:685000,inventoryRetailValueEur:812000,stockTurnDays:71,carsSold:14,averageGrossContributionEur:2104,workshopRevenueEur:21300,workshopGrossProfitEur:10400},
{period:"2026-06",revenueEur:187900,grossProfitEur:37200,operatingExpensesEur:19750,ebitdaEur:17450,cashEur:78900,receivablesEur:12700,payablesEur:24500,inventoryBookValueEur:654000,inventoryRetailValueEur:795000,stockTurnDays:64,carsSold:16,averageGrossContributionEur:2325,workshopRevenueEur:24100,workshopGrossProfitEur:11950},
{period:"2026-07",revenueEur:169250,grossProfitEur:35180,operatingExpensesEur:20120,ebitdaEur:15060,cashEur:81540,receivablesEur:19920,payablesEur:17850,inventoryBookValueEur:631000,inventoryRetailValueEur:772000,stockTurnDays:59,carsSold:15,averageGrossContributionEur:2345,workshopRevenueEur:28750,workshopGrossProfitEur:14320}
];
export const ledgerEntries:LedgerEntry[]=[
{id:"LE-1",bookedAt:"2026-07-08",type:"sale",description:"Verkoop voertuig INV-2026-0042",debitAccount:"1300 Debiteuren",creditAccount:"8000 Autoverkopen",amountCents:2492000,invoiceId:"INV-2026-0042",vehicleId:"VV-2026-1001",immutable:true},
{id:"LE-2",bookedAt:"2026-07-13",type:"payment",description:"Aanbetaling INV-2026-0042",debitAccount:"1100 Bank",creditAccount:"1300 Debiteuren",amountCents:500000,invoiceId:"INV-2026-0042",immutable:true},
{id:"LE-3",bookedAt:"2026-07-10",type:"purchase",description:"Fource werkplaatsdelen",debitAccount:"4400 Onderdelen",creditAccount:"1600 Crediteuren",amountCents:68500,invoiceId:"PINV-2026-0188",vehicleId:"VV-2026-1003",immutable:true}
];
