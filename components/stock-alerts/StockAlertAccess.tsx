"use client";
import {useEffect,useRef,useState} from "react";
import {StockAlertForm,type StockOption} from "./StockAlertForm";
import {criteriaSummary,type AlertCriteria,type TokenPurpose} from "@/lib/stock-alerts/business";
import styles from "./stock-alerts.module.css";
export function StockAlertAccess({purpose,options=[]}:{purpose:TokenPurpose;options?:StockOption[]}){
  const [token,setToken]=useState(""),[info,setInfo]=useState<{criteria:AlertCriteria;email?:string;status:string}|null>(null),[notice,setNotice]=useState("Link controleren…"),[busy,setBusy]=useState(false);
  const originalToken=useRef<string|undefined>(undefined);
  useEffect(()=>{
    let cancelled=false,generation=0;
    const load=()=>{
      const raw=originalToken.current??new URLSearchParams(location.hash.slice(1)).get("token")??"";originalToken.current=raw;
      const requestGeneration=++generation;history.replaceState(null,"",location.pathname);setToken(raw);setInfo(null);
      if(!raw){setNotice("Open de volledige link uit je e-mail. Deze pagina voert niets automatisch uit.");return;}
      setNotice("Link controleren…");
      fetch("/api/public/stock-alerts/access",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:raw,purpose})}).then(async response=>{const data=await response.json();if(cancelled||requestGeneration!==generation)return;if(!response.ok){setNotice(data.error||"Deze link is niet beschikbaar.");return;}setInfo(data);setNotice("");}).catch(()=>{if(!cancelled&&requestGeneration===generation)setNotice("Link controleren is tijdelijk niet beschikbaar.");});
    };
    const changedHash=()=>{originalToken.current=undefined;load();};
    load();window.addEventListener("hashchange",changedHash);
    return ()=>{cancelled=true;window.removeEventListener("hashchange",changedHash);};
  },[purpose]);
  async function perform(action:"confirm"|"unsubscribe"){
    setBusy(true);try{const response=await fetch("/api/public/stock-alerts/action",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,token})});const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(action==="confirm"){try{sessionStorage.setItem("vv_alert_confirmed","1");}catch{}location.assign("/voorraadalert?bevestigd=1");}
      else{setInfo(null);setNotice("Je voorraadalert is gestopt. Nog niet verzonden berichten worden onderdrukt. Een bericht dat al bij de e-maildienst in behandeling was, kan nog aankomen.");}
    }catch(e){setNotice(e instanceof Error?e.message:"De actie kon niet worden verwerkt.");}finally{setBusy(false);}
  }
  async function save(email:string,criteria:AlertCriteria){const response=await fetch("/api/public/stock-alerts/action",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"manage",token,email,criteria})});const data=await response.json();if(!response.ok)throw new Error(data.error);setToken(data.nextToken);if(!data.changedEmail)setInfo(current=>current?{...current,email,criteria}:current);setNotice(data.changedEmail?"Controleer je nieuwe e-mailadres om deze wijziging te bevestigen. Tot die tijd blijft de bestaande voorraadalert actief.":"Je autowensen zijn opgeslagen.");}
  return <section className={styles.entry}>
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {info&&<><p>{criteriaSummary(info.criteria)}</p>{purpose==="manage"?<StockAlertForm initial={info.criteria} initialEmail={info.email} options={options} available={info.status==="active"} onSave={save}/>:<button type="button" className="button" disabled={busy} onClick={()=>perform(purpose==="confirm"?"confirm":"unsubscribe")}>{purpose==="confirm"?"Bevestig mijn voorraadalert":"Schrijf mij uit"}</button>}</>}
    <p className={styles.small}>Deze persoonlijke pagina is niet bedoeld om te delen. <a href="/voorraadalert">Nieuwe voorraadalert aanvragen</a></p>
  </section>;
}
