"use client";
import {useState} from "react";
import {criteriaSummary,type Subscription} from "@/lib/stock-alerts/business";
import styles from "./stock-alerts.module.css";
type History={jobs:{id:string;state:string;outcome?:string;kind:string;providerId?:string;createdAt:string;revision:number;attempts:number}[];candidates:{id:string;vehicleId:string;state:string}[]};
export function StockAlertAdmin({rows,canManage}:{rows:Subscription[];canManage:boolean}){
  const [notice,setNotice]=useState(""),[history,setHistory]=useState<Record<string,History>>({}),[busy,setBusy]=useState(false);
  async function show(id:string){try{const response=await fetch(`/api/vvos/stock-alerts?id=${encodeURIComponent(id)}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error);setHistory(current=>({...current,[id]:data}));}catch{setNotice("Historie niet beschikbaar.");}}
  async function act(action:"stop"|"retry",id:string,revision:number){setBusy(true);try{const response=await fetch("/api/vvos/stock-alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,id,revision})});const data=await response.json();if(!response.ok)throw new Error(data.error);setNotice("Wijziging opgeslagen. Vernieuw dit overzicht voor de actuele status.");}catch(e){setNotice(e instanceof Error?e.message:"Actie niet beschikbaar.");}finally{setBusy(false);}}
  return <section>{notice&&<p role="status" className={styles.notice}>{notice}</p>}{rows.map(row=><article key={row.id} className={styles.entry}>
    <h3>{criteriaSummary(row.criteria)}</h3><p>{row.email} · {row.status}</p><p>Aangemeld: {new Date(row.createdAt).toLocaleString("nl-NL",{timeZone:"Europe/Amsterdam"})}. Bevestigd: {row.confirmedAt?new Date(row.confirmedAt).toLocaleString("nl-NL",{timeZone:"Europe/Amsterdam"}):"Nog niet bevestigd"}.</p>
    <button type="button" className="button secondary" onClick={()=>show(row.id)}>Match- en verzendhistorie</button>{canManage&&["active","pending"].includes(row.status)&&<button type="button" disabled={busy} className="button secondary" onClick={()=>act("stop",row.id,row.revision)}>Stop voorraadalert</button>}
    {history[row.id]&&<div><h4>Matchkandidaten (maximaal 50)</h4>{history[row.id].candidates.length?<ul>{history[row.id].candidates.map(candidate=><li key={candidate.id}>{candidate.vehicleId} · {candidate.state}</li>)}</ul>:<p>Nog geen kandidaten geregistreerd.</p>}
      <h4>Laatste 20 verzendopdrachten</h4>{history[row.id].jobs.length?<ul>{history[row.id].jobs.map(job=><li key={job.id}>{job.kind} · {job.state} · {job.outcome??"Nog geen provideruitkomst"}{job.providerId?` · Providerreferentie: ${job.providerId}`:""}{canManage&&job.state==="failed"&&job.outcome==="rejected"&&job.attempts<3&&<button type="button" disabled={busy} onClick={()=>act("retry",job.id,job.revision)}>Veilig opnieuw proberen</button>}</li>)}</ul>:<p>Nog geen verzendhistorie.</p>}</div>}
  </article>)}</section>;
}
