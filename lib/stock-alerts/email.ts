import type {Vehicle} from "@/types";
import {criteriaSummary,type AlertCriteria, type TokenPurpose} from "./business";
export interface AlertMail {to:string;subject:string;html:string;text:string;reference:string}
const escape=(value:unknown)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);
export function accessLink(origin:string,purpose:TokenPurpose,token:string){
  const paths={confirm:"bevestigen",manage:"beheren",unsubscribe:"uitschrijven"};
  return `${origin}/voorraadalert/${paths[purpose]}#token=${encodeURIComponent(token)}`;
}
export function vehicleAlertUrl(origin:string,vehicle:Vehicle){return `${origin}/voorraad/${encodeURIComponent(vehicle.slug)}?utm_source=voorraadalert&utm_medium=email&utm_campaign=voorraad_matches`;}
function trialUrl(origin:string,vehicle:Vehicle){return `${origin}/contact?${new URLSearchParams({vehicleId:vehicle.id,intent:"proefrit",utm_source:"voorraadalert",utm_medium:"email",utm_campaign:"voorraad_matches"})}#aanvraag`;}
export function renderAlertMail(input:{to:string;reference:string;origin:string;kind:"confirmation"|"digest";criteria:AlertCriteria;tokens:Partial<Record<TokenPurpose,string>>;vehicles:Vehicle[]}):AlertMail{
  const {origin,tokens}=input,summary=criteriaSummary(input.criteria);
  const subject=input.kind==="confirmation"?"Bevestig je voorraadalert bij Volt & Vroom":"Er staat een auto voor je klaar bij Volt & Vroom";
  const button=(href:string,label:string)=>`<a href="${escape(href)}" style="display:inline-block;background:#10212e;color:white;padding:14px 20px;border-radius:6px;text-decoration:none;font-weight:600">${escape(label)}</a>`;
  const confirmation=input.kind==="confirmation";
  const intro=confirmation?"Bevestig dat je een voorraadalert wilt ontvangen. Daarna sturen we maximaal één overzicht per dag wanneer er nieuwe passende auto’s zijn.":"Er is nieuw aanbod dat past bij je opgeslagen wensen. Bekijk de actuele gegevens en beschikbaarheid op onze website.";
  const content=confirmation?`<p>${button(accessLink(origin,"confirm",tokens.confirm!),"Bevestig mijn voorraadalert")}</p><p>Deze link is 48 uur geldig. Heb je dit niet aangevraagd? Dan hoef je niets te doen.</p>`:input.vehicles.map(vehicle=>{
    const url=vehicleAlertUrl(origin,vehicle),title=[vehicle.brand,vehicle.model,vehicle.trim].filter(Boolean).join(" ");
    const price=Number.isSafeInteger(vehicle.priceCents)&&vehicle.priceCents>0?new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(vehicle.priceCents/100):"Prijs op aanvraag";
    const facts=[vehicle.year?String(vehicle.year):"Bouwjaar niet vermeld",Number.isFinite(vehicle.mileageKm)?`${vehicle.mileageKm.toLocaleString("nl-NL")} km`:"Kilometerstand niet vermeld"].join(" · ");
    let image="";try{const u=new URL(vehicle.images[0]);if(u.protocol==="https:"&&!u.username&&!u.password)image=`<a href="${escape(url)}"><img src="${escape(u.href)}" alt="${escape(title)}" width="552" style="width:100%;height:auto;border-radius:6px" /></a>`;}catch{}
    const trial=trialUrl(origin,vehicle);
    return `<section style="padding:24px 0;border-top:1px solid #dfe6eb">${image}<h2 style="font-family:Manrope,Arial,sans-serif;font-size:22px">${escape(title)}</h2><p><strong>${escape(price)}</strong></p><p>${escape(facts)}</p><p>Past bij: ${escape(summary)}</p>${button(url,"Bekijk deze auto")}<p><a href="${escape(trial)}" style="color:#10212e">Plan een proefrit</a></p></section>`;
  }).join("");
  const footer=confirmation?"":`<p><a href="${escape(accessLink(origin,"manage",tokens.manage!))}">Zoekwensen beheren</a> · <a href="${escape(accessLink(origin,"unsubscribe",tokens.unsubscribe!))}">Uitschrijven</a></p>`;
  const html=`<!doctype html><html lang="nl"><head><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escape(subject)}</title></head><body style="margin:0;background:#f5f8fa;color:#10212e;font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6"><main style="max-width:600px;margin:24px auto;background:#fff;padding:24px;box-sizing:border-box"><img src="${escape(origin)}/brand/favicon-192.png" width="42" height="42" alt=""/><p style="font-family:Manrope,Arial,sans-serif;font-size:22px">Volt &amp; Vroom</p><h1 style="font-family:Manrope,Arial,sans-serif;font-size:28px">${confirmation?"Bevestig je autowensen.":"Een auto die bij je past."}</h1><p>${intro}</p><p style="background:#eff7ff;padding:16px">${escape(summary)}</p>${content}${footer}<p style="font-size:13px;color:#52616c">Volt &amp; Vroom · Euvelgunnerweg 50 · 9723 CW Groningen<br/><a href="${escape(origin)}/privacy#voorraadalert">Privacy en voorraadalerts</a></p></main></body></html>`;
  const text=["Volt & Vroom",subject,intro,summary,confirmation?`Bevestigen: ${accessLink(origin,"confirm",tokens.confirm!)}\nDeze link is 48 uur geldig. Niet aangevraagd? Doe niets.`:input.vehicles.map(vehicle=>`${vehicle.brand} ${vehicle.model} ${vehicle.trim}\n${vehicle.priceCents>0?`€ ${(vehicle.priceCents/100).toFixed(2)}`:"Prijs op aanvraag"} · ${vehicle.year??""} · ${vehicle.mileageKm??""} km\n${vehicleAlertUrl(origin,vehicle)}\nPlan een proefrit: ${trialUrl(origin,vehicle)}`).join("\n\n"),
    confirmation?"":`Zoekwensen beheren: ${accessLink(origin,"manage",tokens.manage!)}\nUitschrijven: ${accessLink(origin,"unsubscribe",tokens.unsubscribe!)}`,`Privacy: ${origin}/privacy#voorraadalert`].filter(Boolean).join("\n\n");
  return {to:input.to,reference:input.reference,subject,html,text};
}
