import type { Invoice, InvoiceLine, VehicleCosts, VehicleProfitability, VatBreakdown } from "@/types";

export const roundMoney = (value:number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function invoiceTotals(lines:InvoiceLine[]) {
  const subtotalCents = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPriceCents), 0);
  const vatCents = lines.reduce((sum, line) => sum + Math.round(Math.round(line.quantity * line.unitPriceCents) * line.vatPercent / 100), 0);
  return { subtotalCents, vatCents, totalCents: subtotalCents + vatCents };
}
export function vatBreakdown(lines:InvoiceLine[]):VatBreakdown[]{
  const grouped = new Map<number,{netCents:number;vatCents:number}>();
  for(const line of lines){const netCents=Math.round(line.quantity*line.unitPriceCents); const vatCents=Math.round(netCents*line.vatPercent/100); const row=grouped.get(line.vatPercent)??{netCents:0,vatCents:0}; row.netCents+=netCents;row.vatCents+=vatCents;grouped.set(line.vatPercent,row)}
  return [...grouped.entries()].map(([rate,value])=>({rate,netCents:value.netCents,vatCents:value.vatCents,grossCents:value.netCents+value.vatCents}));
}
export function invoiceOpenAmount(invoice:Invoice){return Math.max(0,invoice.totalCents-invoice.paidCents)}
export function isOverdue(invoice:Invoice, now=new Date()){return !["paid","cancelled"].includes(invoice.status)&&new Date(invoice.dueDate)<now}
export function directVehicleCosts(costs?:VehicleCosts){if(!costs)return 0;return Object.values(costs).reduce((s,v)=>s+v,0)}
export function vehicleProfit(input:Omit<VehicleProfitability,"grossContributionEur"|"contributionPercent">):VehicleProfitability{
  const grossContributionEur=roundMoney(input.salePriceEur-input.purchasePriceEur-input.directCostsEur-input.financeCostsEur-input.warrantyProvisionEur+input.tradeInMarginEur+input.upsellMarginEur);
  const contributionPercent=input.salePriceEur?roundMoney(grossContributionEur/input.salePriceEur*100):0;
  return {...input,grossContributionEur,contributionPercent};
}
export function agedReceivables(invoices:Invoice[], now=new Date()){
  const buckets={current:0,days1to30:0,days31to60:0,days61plus:0};
  for(const invoice of invoices.filter(i=>i.kind==="sales"&&invoiceOpenAmount(i)>0)){
    const due=new Date(invoice.dueDate); const days=Math.floor((now.getTime()-due.getTime())/86400000); const open=invoiceOpenAmount(invoice);
    if(days<=0)buckets.current+=open; else if(days<=30)buckets.days1to30+=open; else if(days<=60)buckets.days31to60+=open; else buckets.days61plus+=open;
  }
  return buckets;
}
