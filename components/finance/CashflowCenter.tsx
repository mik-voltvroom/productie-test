"use client";
import { useMemo, useState } from "react";
import type { BankTransaction, Invoice } from "@/types";
import { eur } from "@/lib/format";
import { invoiceOpenAmount } from "@/lib/finance/business";
import { centsToEuros, signedCentsToEuros } from "@/lib/money";
export function CashflowCenter({initialTransactions,invoices}:{initialTransactions:BankTransaction[];invoices:Invoice[]}){
 const [rows,setRows]=useState(initialTransactions); const open=invoices.filter(i=>invoiceOpenAmount(i)>0); const unmatched=rows.filter(r=>r.status!=="matched"); const inflowCents=rows.filter(r=>r.amountCents>0).reduce((s,r)=>s+r.amountCents,0),outflowCents=Math.abs(rows.filter(r=>r.amountCents<0).reduce((s,r)=>s+r.amountCents,0));
 function match(id:string,invoiceId:string){setRows(old=>old.map(r=>r.id===id?{...r,matchedInvoiceId:invoiceId,status:"matched"}:r))}
 return <div><div className="metrics"><div className="metric"><strong>{eur.format(centsToEuros(inflowCents))}</strong><span>inkomend</span></div><div className="metric"><strong>{eur.format(centsToEuros(outflowCents))}</strong><span>uitgaand</span></div><div className="metric"><strong>{eur.format(signedCentsToEuros(inflowCents-outflowCents))}</strong><span>netto kasstroom</span></div><div className="metric"><strong>{unmatched.length}</strong><span>te verwerken</span></div></div><div className="cashflowList">{rows.map(t=><article key={t.id}><div><span className="eyebrow">{new Date(t.bookedAt).toLocaleDateString("nl-NL")}</span><h3>{t.description}</h3><small>{t.counterparty||"Onbekende tegenpartij"} · {t.category.replaceAll("_"," ")}</small></div><strong className={t.amountCents>=0?"positive":"negative"}>{eur.format(signedCentsToEuros(t.amountCents))}</strong><div><span className={`statusPill ${t.status}`}>{t.status}</span>{t.status!=="matched"&&<select defaultValue="" onChange={e=>e.target.value&&match(t.id,e.target.value)}><option value="">Koppel aan factuur</option>{open.map(i=><option key={i.id} value={i.id}>{i.number} · {i.customerOrSupplier} · {eur.format(centsToEuros(invoiceOpenAmount(i)))}</option>)}</select>}</div></article>)}</div></div>
}
