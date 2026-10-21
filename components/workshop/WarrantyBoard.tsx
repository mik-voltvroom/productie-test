"use client";
import { useMemo, useState } from "react";
import type { WarrantyClaim, WarrantyClaimStatus } from "@/types";
import { claimExposure } from "@/lib/workshop/business";
import { eur } from "@/lib/format";

const statuses: WarrantyClaimStatus[] = ["reported", "assessment", "approved", "rejected", "repairing", "completed"];
export function WarrantyBoard({ initialClaims }: { initialClaims: WarrantyClaim[] }) {
  const [claims, setClaims] = useState(initialClaims);
  const exposure = useMemo(() => claimExposure(claims), [claims]);
  return <>
    <div className="metrics"><div className="metric"><span>Open claims</span><strong>{claims.filter(c => !["completed","rejected"].includes(c.status)).length}</strong></div><div className="metric"><span>Risicoreservering</span><strong>{eur.format(exposure)}</strong></div><div className="metric"><span>Afgerond</span><strong>{claims.filter(c => c.status === "completed").length}</strong></div><div className="metric"><span>Gem. claim</span><strong>{eur.format(claims.reduce((s,c)=>s+c.estimatedCostEur,0)/claims.length)}</strong></div></div>
    <div className="claimGrid">{claims.map(claim => <article className="panel" key={claim.id}><div className="leadMeta"><span>{claim.claimNumber}</span><span>{new Date(claim.reportedAt).toLocaleDateString("nl-NL")}</span></div><h3>{claim.vehicleLabel}</h3><p className="muted">{claim.customerName} · {claim.licensePlate}</p><p>{claim.complaint}</p><div className="miniRecord"><span>Diagnose</span><strong>{claim.diagnosis || "Nog te bepalen"}</strong></div><div className="miniRecord"><span>Raming</span><strong>{eur.format(claim.estimatedCostEur)}</strong></div><select value={claim.status} onChange={e => setClaims(list => list.map(c => c.id === claim.id ? { ...c, status: e.target.value as WarrantyClaimStatus } : c))}>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></article>)}</div>
  </>;
}
