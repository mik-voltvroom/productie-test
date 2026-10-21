"use client";
import {useEffect,useId,useState,type FormEvent} from "react";
import {criteriaSchema,consentText,type AlertCriteria} from "@/lib/stock-alerts/business";
import styles from "./stock-alerts.module.css";
export type StockOption={brand:string;model:string;bodyStyle?:string};
export function alertEvent(event:string){window.dispatchEvent(new CustomEvent("vv:stock-alert",{detail:{event}}));}
export function StockAlertForm({initial={},initialEmail="",options=[],available=false,onSave}:{initial?:Partial<AlertCriteria>;initialEmail?:string;options?:StockOption[];available?:boolean;onSave?:(email:string,criteria:AlertCriteria)=>Promise<void>}){
  const [criteria,setCriteria]=useState<Partial<AlertCriteria>>({drive:"any",category:"all",allStock:false,...initial});
  const formId=useId();
  const [email,setEmail]=useState(initialEmail),[consent,setConsent]=useState(false),[website,setWebsite]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
  const brands=[...new Set(options.map(option=>option.brand))].sort();
  const bodyStyles=[...new Set(options.map(option=>option.bodyStyle).filter((value):value is string=>Boolean(value&&!['onbekend','unknown'].includes(value.trim().toLocaleLowerCase('nl-NL')))))].sort();
  const models=[...new Set(options.filter(option=>option.brand===criteria.brand).map(option=>option.model))].sort();
  const update=(key:keyof AlertCriteria,value:unknown)=>setCriteria(current=>({...current,[key]:value}));
  const money=(key:"minPriceCents"|"maxPriceCents",value:string)=>update(key,value===""?undefined:Math.round(Number(value)*100));
  const numeric=(key:"minYear"|"maxYear"|"maxMileageKm",value:string)=>update(key,value===""?undefined:Number(value));
  async function submit(event:FormEvent){
    event.preventDefault();setError("");const result=criteriaSchema.safeParse(criteria);
    if(!result.success){setError(result.error.issues[0].message);return;}
    if(!onSave&&!consent){setError("Geef toestemming voor de voorraadalert.");return;}
    setBusy(true);
    try{
      if(onSave)await onSave(email,result.data);
      else {
        const response=await fetch("/api/public/stock-alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,criteria:result.data,consent,website})});
        const data=await response.json();if(!response.ok)throw new Error(data.error||"Aanmelden is tijdelijk niet beschikbaar.");
        alertEvent("stock_alert_signup_submitted");setDone(true);
      }
    }catch(e){setError(e instanceof Error?e.message:"De wijziging kon niet worden opgeslagen.");}finally{setBusy(false);}
  }
  if(done)return <p className={styles.notice} role="status">Controleer je e-mail om je voorraadalert te bevestigen.</p>;
  return <form onSubmit={submit} className={styles.form}>
    <label className={styles.choice}><input type="checkbox" checked={criteria.allStock??false} onChange={event=>setCriteria(event.target.checked?{allStock:true,drive:"any",category:"all"}:{allStock:false,drive:"any",category:"all"})}/> Alle nieuwe voorraad</label>
    {!criteria.allStock&&<>
      <div className={styles.grid}>
        <label>Merk<input list={`${formId}-brands`} maxLength={80} value={criteria.brand??""} onChange={event=>setCriteria(current=>({...current,brand:event.target.value||undefined,model:undefined}))}/><datalist id={`${formId}-brands`}>{brands.map(brand=><option key={brand} value={brand}/>)}</datalist></label>
        <label>Model<input list={`${formId}-models`} disabled={!criteria.brand} maxLength={80} value={criteria.model??""} onChange={event=>update("model",event.target.value||undefined)}/><datalist id={`${formId}-models`}>{models.map(model=><option key={model} value={model}/>)}</datalist></label>
        <label>Aandrijving<select value={criteria.drive??"any"} onChange={event=>{update("drive",event.target.value);update("driveType",undefined);update("category","all");}}><option value="any">Geen voorkeur</option><option value="hybrid">Hybride</option><option value="electric">Elektrisch</option><option value="combustion">Benzine/overig</option></select></label>
        <label>Maximale aanschafprijs (€)<input type="number" min="1" max="1000000" step="0.01" value={criteria.maxPriceCents===undefined?"":criteria.maxPriceCents/100} onChange={event=>money("maxPriceCents",event.target.value)}/></label>
      </div>
      <details open={Boolean(initial.minPriceCents||initial.maxYear||initial.fuelType||initial.trim||initial.driveType||initial.bodyStyle||initial.category&&initial.category!=="all")||undefined}><summary>Meer wensen</summary><div className={styles.grid}>
        <label>Minimaal bouwjaar<input type="number" min="1886" max="2100" value={criteria.minYear??""} onChange={event=>numeric("minYear",event.target.value)}/></label>
        <label>Maximale kilometerstand<input type="number" min="0" max="2000000" value={criteria.maxMileageKm??""} onChange={event=>numeric("maxMileageKm",event.target.value)}/></label>
        <label>Carrosserie<input list={`${formId}-body-styles`} maxLength={80} value={criteria.bodyStyle??""} onChange={event=>update("bodyStyle",event.target.value||undefined)}/><datalist id={`${formId}-body-styles`}>{bodyStyles.map(value=><option key={value} value={value}/>)}</datalist></label>
        <label>Maximaal bouwjaar<input type="number" min="1886" max="2100" value={criteria.maxYear??""} onChange={event=>numeric("maxYear",event.target.value)}/></label>
        <label>Minimale aanschafprijs (€)<input type="number" min="1" max="1000000" step="0.01" value={criteria.minPriceCents===undefined?"":criteria.minPriceCents/100} onChange={event=>money("minPriceCents",event.target.value)}/></label>
        <label>Precieze aandrijving<select value={criteria.driveType??""} onChange={event=>update("driveType",event.target.value||undefined)}><option value="">Geen extra beperking</option><option value="full-hybrid">Hybride</option><option value="plug-in-hybrid">Plug-in hybride</option><option value="electric">Elektrisch</option><option value="combustion">Verbrandingsmotor</option></select></label>
        <label>Categorie<select value={criteria.category??"all"} onChange={event=>update("category",event.target.value)}><option value="all">Alle categorieën</option><option value="hybrid">Hybride</option><option value="electric">Elektrisch</option><option value="icons">Icons</option></select></label>
        <label>Brandstof<input maxLength={80} value={criteria.fuelType??""} onChange={event=>update("fuelType",event.target.value||undefined)}/></label>
        <label>Uitvoering<input maxLength={80} value={criteria.trim??""} onChange={event=>update("trim",event.target.value||undefined)}/></label>
      </div></details>
    </>}
    <label>E-mailadres<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label>
    {!onSave&&<label className={styles.choice}><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>{consentText} <a href="/privacy#voorraadalert">Privacy-informatie</a></span></label>}
    {!onSave&&<div hidden aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event=>setWebsite(event.target.value)}/></label></div>}
    {!available&&<p className={styles.notice}>De voorraadalert wordt voorbereid en is nog niet beschikbaar. Er wordt nu niets verzonden.</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <button className="button" disabled={busy||!available} type="submit">{busy?"Even wachten…":onSave?"Wijzigingen opslaan":"Bewaar mijn autowensen"}</button>
    <p className={styles.small}>Alleen exacte matches. Maximaal één overzicht per dag, vanaf 09:00 uur. Geen nieuwsbrief.</p>
  </form>;
}
export function StockAlertEntry({initial,options,available,empty=false}:{initial:Partial<AlertCriteria>;options:StockOption[];available:boolean;empty?:boolean}){
  const [open,setOpen]=useState(false),[saved,setSaved]=useState(initial);
  return <section className={styles.entry} aria-label="Persoonlijke voorraadalert">
    {empty?<><h2>Jouw auto staat er nog niet tussen.</h2><p>Bewaar je wensen. We laten het weten zodra er een passende auto binnenkomt.</p></>:<p>Ontvang bericht zodra een auto aansluit op jouw wensen.</p>}
    <button type="button" className="button secondary" aria-expanded={open} onClick={()=>{if(!open){setSaved(initial);alertEvent("stock_alert_form_opened");}setOpen(!open);}}>Houd mij op de hoogte</button>
    {open&&<StockAlertForm initial={saved} options={options} available={available}/>}
  </section>;
}
export function ConfirmedNotice(){
  const [confirmed,setConfirmed]=useState(false);
  useEffect(()=>{try{if(sessionStorage.getItem("vv_alert_confirmed")==="1"){sessionStorage.removeItem("vv_alert_confirmed");setConfirmed(true);queueMicrotask(()=>alertEvent("stock_alert_confirmed"));}}catch{}},[]);
  return confirmed?<p role="status" className={styles.notice}>Je voorraadalert is bevestigd. Beschikbaar passend aanbod gaat mee in je eerstvolgende dagoverzicht.</p>:null;
}
