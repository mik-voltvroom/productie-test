"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./vehicle-check.module.css";

type Status = "ok" | "attention" | "fail" | "na";
type Check = { id: string; label: string; status: Status; note: string };
type Tyre = { position: string; tread: string; pressure: string };
type LaunchImportState = "idle" | "reading" | "imported" | "error";

type Report = {
  id: string;
  createdAt: string;
  inspector: string;
  plate: string;
  vin: string;
  brand: string;
  model: string;
  mileage: string;
  driveType: string;
  batterySoH: string;
  batterySoc: string;
  cellDeltaMv: string;
  dtcs: string;
  checks: Check[];
  tyres: Tyre[];
  roadTest: string;
  advice: string;
};

const STORAGE_KEY = "vvos.vehicle-check.v1";
const baseChecks: Check[] = [
  ["body","Carrosserie & lak"],["glass","Ruiten & spiegels"],["lights","Verlichting"],["interior","Interieur"],
  ["fluids","Vloeistoffen"],["brakes","Remmen"],["suspension","Onderstel"],["documents","Documentatie & onderhoud"],
  ["charging","Laadpoort / laadkabel"],["warning","Waarschuwingslampjes"],["hv","HV-systeem"],["adas","ADAS / assistentiesystemen"]
].map(([id,label])=>({id,label,status:"ok" as Status,note:""}));
const baseTyres: Tyre[] = ["LV","RV","LA","RA"].map(position=>({position,tread:"",pressure:""}));

function newReport(): Report {
  return { id:`VV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, createdAt:new Date().toISOString(), inspector:"Mik", plate:"", vin:"", brand:"", model:"", mileage:"", driveType:"hybrid", batterySoH:"", batterySoc:"", cellDeltaMv:"", dtcs:"", checks:baseChecks, tyres:baseTyres, roadTest:"", advice:"" };
}

const statusLabels: Record<Status,string> = {ok:"Goed",attention:"Aandacht",fail:"Afkeur",na:"N.v.t."};

type LaunchFault = { system:string; code:string; description:string; status:string };
type LaunchParsed = { vin:string; plate:string; brand:string; model:string; mileage:string; soh:string; soc:string; cellDelta:string; dtcs:string; systemCount:number; faultCount:number; activeCount:number };

function decodeLaunchBase64<T>(value:string):T{
  const bytes=Uint8Array.from(atob(value),character=>character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function parseLaunchText(raw:string):LaunchParsed{
  const clean=raw.replace(/\r/g,"");
  const find=(patterns:RegExp[])=>{for(const p of patterns){const match=clean.match(p);if(match?.[1])return match[1].trim()}return ""};
  const lines=[...new Set(clean.split("\n").filter(line=>/\b[PBCU][0-9A-F]{4,6}\b/i.test(line)).map(line=>line.trim()).filter(Boolean))];
  return {
    vin:find([/(?:VIN|Vehicle Identification Number|Chassis No\.?)[\s:#-]*([A-HJ-NPR-Z0-9]{17})/i,/\b([A-HJ-NPR-Z0-9]{17})\b/]),
    plate:find([/(?:License Plate|Registration|Kenteken)[\s:#-]*([A-Z0-9-]{5,12})/i]),
    brand:find([/(?:Vehicle Make|Manufacturer|Merk)[\s:#-]*([^\n]+)/i]),
    model:find([/(?:Vehicle Model|Model)[\s:#-]*([^\n]+)/i]),
    mileage:find([/(?:Mileage|Odometer|Kilometerstand)[\s:#-]*([0-9.,]+)/i]),
    soh:find([/(?:State of Health|SOH)[\s:#-]*([0-9.,]+)\s*%/i]),
    soc:find([/(?:State of Charge|SOC)[\s:#-]*([0-9.,]+)\s*%/i]),
    cellDelta:find([/(?:Cell (?:voltage )?(?:delta|difference|deviation)|Celspreiding)[\s:#-]*([0-9.,]+)\s*mV/i]),
    dtcs:lines.join("\n"),systemCount:0,faultCount:lines.length,activeCount:0
  };
}

async function parseLaunchFile(file:File):Promise<LaunchParsed>{
  if(!file.name.toLowerCase().endsWith(".pdf"))return parseLaunchText(await file.text());
  const pdf=new TextDecoder("latin1").decode(await file.arrayBuffer());
  const titleEncoded=pdf.match(/\/Title\(([A-Za-z0-9+/=]+)\)/)?.[1];
  const keywordsEncoded=pdf.match(/\/Keywords\(([A-Za-z0-9+/=]+)\)/)?.[1];
  if(!titleEncoded||!keywordsEncoded)throw new Error("Launch metadata ontbreekt");
  const info=decodeLaunchBase64<{Vin?:string;Make?:string;Model?:string;tester?:string}>(titleEncoded);
  const data=decodeLaunchBase64<{systemStateBeanList?:Array<{systemName?:string;faultCodesList?:Array<{title?:string;context?:string;status?:string}>}>}>(keywordsEncoded);
  const systems=data.systemStateBeanList??[];
  const faults:LaunchFault[]=systems.flatMap(system=>(system.faultCodesList??[]).map(fault=>({
    system:system.systemName??"Onbekend systeem",code:fault.title??"Onbekende code",description:fault.context??"",status:fault.status??"Onbekend"
  })));
  return {
    vin:info.Vin??"",plate:"",brand:info.Make??"",model:info.Model??"",mileage:"",soh:"",soc:"",cellDelta:"",
    dtcs:faults.map(fault=>`${fault.system} · ${fault.code} — ${fault.description} [${fault.status}]`).join("\n"),
    systemCount:systems.length,faultCount:faults.length,activeCount:faults.filter(fault=>/active|static/i.test(fault.status)).length
  };
}

export default function VehicleCheckPage(){
  const [report,setReport] = useState<Report>(newReport());
  const [saved,setSaved] = useState(false);
  const [obdState,setObdState] = useState<"idle"|"demo"|"launch">("idle");
  const [launchImport,setLaunchImport] = useState<LaunchImportState>("idle");
  const [launchMessage,setLaunchMessage] = useState("");

  useEffect(()=>{ const raw=localStorage.getItem(STORAGE_KEY); if(raw){try{setReport(JSON.parse(raw))}catch{}} },[]);
  useEffect(()=>{ localStorage.setItem(STORAGE_KEY,JSON.stringify(report)); setSaved(true); const t=setTimeout(()=>setSaved(false),800); return ()=>clearTimeout(t); },[report]);

  const score = useMemo(()=>{
    const relevant=report.checks.filter(c=>c.status!=="na"); if(!relevant.length)return 0;
    const points=relevant.reduce((s,c)=>s+(c.status==="ok"?1:c.status==="attention"?.55:0),0);
    return Math.round(points/relevant.length*100);
  },[report.checks]);
  const verdict = score>=90?"GOED":score>=70?"AANDACHT":"NIET VRIJGEVEN";

  const setField=(key:keyof Report,value:string)=>setReport(r=>({...r,[key]:value}));
  const setCheck=(id:string,patch:Partial<Check>)=>setReport(r=>({...r,checks:r.checks.map(c=>c.id===id?{...c,...patch}:c)}));
  const setTyre=(position:string,key:"tread"|"pressure",value:string)=>setReport(r=>({...r,tyres:r.tyres.map(t=>t.position===position?{...t,[key]:value}:t)}));
  const reset=()=>{ if(confirm("Nieuwe voertuigcheck starten? De huidige lokale check wordt vervangen.")) setReport(newReport()); };
  const demoObd=()=>{setObdState("demo"); setReport(r=>({...r,batterySoH:r.batterySoH||"94",batterySoc:r.batterySoc||"67",cellDeltaMv:r.cellDeltaMv||"18",dtcs:r.dtcs||"Geen actieve emissiegerelateerde DTC's gevonden (demo)",checks:r.checks.map(c=>c.id==="hv"||c.id==="warning"?{...c,status:"ok"}:c)}));};

  const importLaunchReport=async(file?:File)=>{
    if(!file)return;
    setLaunchImport("reading");
    setLaunchMessage("Launch Health Report wordt verwerkt…");
    try{
      const parsed=await parseLaunchFile(file);
      if(!parsed.vin&&!parsed.dtcs&&!parsed.brand&&!parsed.model)throw new Error("Geen Launch-velden gevonden");
      setReport(r=>({...r,vin:parsed.vin||r.vin,plate:parsed.plate||r.plate,brand:parsed.brand||r.brand,model:parsed.model||r.model,mileage:parsed.mileage||r.mileage,batterySoH:parsed.soh||r.batterySoH,batterySoc:parsed.soc||r.batterySoc,cellDeltaMv:parsed.cellDelta||r.cellDeltaMv,dtcs:parsed.dtcs||"Launch Health Report: geen DTC's gevonden",checks:r.checks.map(c=>c.id==="warning"&&parsed.faultCount?{...c,status:"attention"}:c)}));
      setObdState("launch");
      setLaunchImport("imported");
      setLaunchMessage(`PDF gekoppeld · ${parsed.systemCount||"?"} systemen · ${parsed.faultCount} foutcodes · ${parsed.activeCount} actief/statisch`);
    }catch{
      setLaunchImport("error");
      setLaunchMessage("Dit bestand bevat geen herkenbare Launch X-431 rapportdata.");
    }
  };

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div><p className={styles.kicker}>VVOS · Vehicle Intelligence</p><h1>Voertuigcheck</h1><p>Mobiele inspectie, hybride/EV-data en één uniform VVOS Voertuigrapport.</p></div>
      <div className={styles.heroActions}><span className={styles.saved}>{saved?"Opgeslagen":"Autosave actief"}</span><button onClick={reset} className={styles.ghost}>Nieuwe check</button><button onClick={()=>window.print()} className={styles.primary}>Rapport / PDF</button></div>
    </header>

    <section className={styles.scoreCard}>
      <div><span>Rapport</span><strong>{report.id}</strong></div><div><span>Inspectiescore</span><strong>{score}%</strong></div><div><span>Eindoordeel</span><strong className={score>=90?styles.good:score>=70?styles.warn:styles.bad}>{verdict}</strong></div>
    </section>

    <section className={styles.card}><div className={styles.sectionHead}><div><span>01</span><h2>Voertuig</h2></div><p>Basisidentificatie</p></div>
      <div className={styles.grid}>
        <label>Kenteken<input value={report.plate} onChange={e=>setField("plate",e.target.value.toUpperCase())} placeholder="XX-999-X"/></label>
        <label>VIN<input value={report.vin} onChange={e=>setField("vin",e.target.value.toUpperCase())} placeholder="17 tekens"/></label>
        <label>Merk<input value={report.brand} onChange={e=>setField("brand",e.target.value)} placeholder="Toyota"/></label>
        <label>Model<input value={report.model} onChange={e=>setField("model",e.target.value)} placeholder="Yaris Cross"/></label>
        <label>Kilometerstand<input inputMode="numeric" value={report.mileage} onChange={e=>setField("mileage",e.target.value)} placeholder="48.250"/></label>
        <label>Aandrijving<select value={report.driveType} onChange={e=>setField("driveType",e.target.value)}><option value="hybrid">Hybrid</option><option value="phev">Plug-in hybrid</option><option value="ev">Elektrisch</option><option value="ice">Brandstof</option></select></label>
      </div>
    </section>

    <section className={styles.card}><div className={styles.sectionHead}><div><span>02</span><h2>OBD & Hybrid Health</h2></div><div className={styles.importActions}><label className={styles.launchImport}>Importeer Launch<input type="file" accept=".pdf,.txt,.json,application/pdf,text/plain,application/json" onChange={e=>importLaunchReport(e.target.files?.[0])}/></label><button onClick={demoObd} className={styles.ghost}>Demo scan</button></div></div>
      {launchImport!=="idle"&&<div className={launchImport==="error"?styles.importError:styles.importStatus}><b>{launchImport==="imported"?"LAUNCH X-431 V+":"Launch-import"}</b><span>{launchMessage}</span></div>}
      <div className={styles.obdBanner}><div><b>{obdState==="launch"?"Launch Health Report gekoppeld":obdState==="demo"?"OBD-data geladen":"OBD-adapter nog niet gekoppeld"}</b><small>Web/PWA ondersteunt de volledige inspectie. Voor directe iPhone-Bluetooth OBD bouwen we een native BLE-adapterlaag; deze knop valideert nu de scanflow met realistische testdata.</small></div><span>{obdState==="launch"?"LAUNCH":obdState==="demo"?"CONNECTED":"READY"}</span></div>
      <div className={styles.grid}><label>State of Health (%)<input inputMode="decimal" value={report.batterySoH} onChange={e=>setField("batterySoH",e.target.value)} placeholder="bijv. 94"/></label><label>State of Charge (%)<input inputMode="decimal" value={report.batterySoc} onChange={e=>setField("batterySoc",e.target.value)} placeholder="bijv. 67"/></label><label>Celspreiding (mV)<input inputMode="decimal" value={report.cellDeltaMv} onChange={e=>setField("cellDeltaMv",e.target.value)} placeholder="bijv. 18"/></label><label className={styles.wide}>DTC's / diagnose<textarea value={report.dtcs} onChange={e=>setField("dtcs",e.target.value)} placeholder="P0xxx, omschrijving, status..."/></label></div>
    </section>

    <section className={styles.card}><div className={styles.sectionHead}><div><span>03</span><h2>Fysieke inspectie</h2></div><p>Tik per onderdeel de status aan</p></div>
      <div className={styles.checkList}>{report.checks.map(c=><article key={c.id} className={styles.checkRow}><div><strong>{c.label}</strong><input value={c.note} onChange={e=>setCheck(c.id,{note:e.target.value})} placeholder="Opmerking (optioneel)"/></div><div className={styles.segment}>{(["ok","attention","fail","na"] as Status[]).map(s=><button key={s} onClick={()=>setCheck(c.id,{status:s})} data-active={c.status===s}>{statusLabels[s]}</button>)}</div></article>)}</div>
    </section>

    <section className={styles.card}><div className={styles.sectionHead}><div><span>04</span><h2>Banden</h2></div><p>Profiel en druk per wiel</p></div><div className={styles.tyres}>{report.tyres.map(t=><div key={t.position}><strong>{t.position}</strong><label>Profiel mm<input inputMode="decimal" value={t.tread} onChange={e=>setTyre(t.position,"tread",e.target.value)}/></label><label>Druk bar<input inputMode="decimal" value={t.pressure} onChange={e=>setTyre(t.position,"pressure",e.target.value)}/></label></div>)}</div></section>

    <section className={styles.card}><div className={styles.sectionHead}><div><span>05</span><h2>Proefrit & advies</h2></div><p>Laatste beoordeling</p></div><div className={styles.stack}><label>Proefrit<textarea value={report.roadTest} onChange={e=>setField("roadTest",e.target.value)} placeholder="Sturen, remmen, transmissie, trillingen, geluiden, regeneratie..."/></label><label>Inkoop-/verkoopadvies<textarea value={report.advice} onChange={e=>setField("advice",e.target.value)} placeholder="Vrijgeven, eerst herstellen, specialist laten controleren..."/></label></div></section>

    <section className={`${styles.card} ${styles.report}`}><div className={styles.reportBrand}><img src="/brand/vv-logo-horizontal.svg" alt="Volt & Vroom"/><div><span>VVOS VOERTUIGRAPPORT</span><strong>{report.id}</strong></div></div><div className={styles.reportTitle}><div><p>{report.plate||"Kenteken nog niet ingevuld"}</p><h2>{[report.brand,report.model].filter(Boolean).join(" ")||"Voertuig"}</h2><small>{report.mileage?`${report.mileage} km · `:""}{report.driveType.toUpperCase()}</small></div><div className={styles.reportScore}><b>{score}</b><span>/ 100</span><strong>{verdict}</strong></div></div><div className={styles.reportGrid}><div><span>HV accugezondheid</span><strong>{report.batterySoH?`${report.batterySoH}%`:"Niet gemeten"}</strong></div><div><span>Celspreiding</span><strong>{report.cellDeltaMv?`${report.cellDeltaMv} mV`:"Niet gemeten"}</strong></div><div><span>Inspecteur</span><strong>{report.inspector}</strong></div><div><span>Datum</span><strong>{new Date(report.createdAt).toLocaleDateString("nl-NL")}</strong></div></div>{obdState==="launch"&&<p className={styles.dataSource}>Diagnosebron: LAUNCH X-431 V+ Health Report · geïmporteerd in VVOS</p>}<div className={styles.findings}><h3>Bevindingen</h3>{report.checks.filter(c=>c.status!=="ok"&&c.status!=="na").length===0?<p>Geen aandachtspunten geregistreerd.</p>:report.checks.filter(c=>c.status!=="ok"&&c.status!=="na").map(c=><p key={c.id}><b>{statusLabels[c.status]}</b> · {c.label}{c.note?` — ${c.note}`:""}</p>)}</div>{report.advice&&<div className={styles.findings}><h3>Advies</h3><p>{report.advice}</p></div>}</section>
  </main>;
}
