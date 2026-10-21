import "server-only";
import {adminDb} from "@/lib/firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import {digest} from "./tokens";
import type {Subscription} from "./business";
function db(){if(!adminDb)throw new Error("Alert storage unavailable");return adminDb;}
export async function alertOverview(cursor?:string){
  const subscriptions=db().collection("stockAlertSubscriptions");
  let page=subscriptions.orderBy("__name__").limit(50);if(cursor)page=page.startAfter(cursor);
  const now=new Date().toISOString();
  const [rows,active,pending,queued,failed,control,segments,recent]=await Promise.all([
    page.get(),subscriptions.where("status","==","active").where("validUntil",">",now).count().get(),subscriptions.where("status","==","pending").where("expiresAt",">",now).count().get(),
    db().collection("stockAlertJobs").where("state","==","queued").count().get(),db().collection("stockAlertJobs").where("state","==","failed").count().get(),
    db().collection("stockAlertControl").doc("reconcile").get(),subscriptions.where("status","==","active").where("validUntil",">",now).limit(500).get(),subscriptions.where("createdAt",">=",new Date(Date.now()-7*86400000).toISOString()).count().get(),
  ]);
  const sample=segments.docs.map(doc=>doc.data() as Subscription).filter(sub=>Date.parse(sub.validUntil??"")>Date.now());
  const brands:Record<string,number>={},models:Record<string,number>={},budgets:Record<string,number>={};
  for(const sub of sample){
    const brand=sub.criteria.brand?.normalize("NFKC").trim().toLocaleLowerCase("nl-NL")??"Geen merkvoorkeur";brands[brand]=(brands[brand]??0)+1;
    if(sub.criteria.model){const model=`${brand} ${sub.criteria.model.normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase("nl-NL")}`;models[model]=(models[model]??0)+1;}
    const price=sub.criteria.maxPriceCents;const band=price===undefined?"Geen maximum":price<=2_000_000?"Tot € 20.000":price<=4_000_000?"€ 20.000–40.000":"Boven € 40.000";budgets[band]=(budgets[band]??0)+1;
  }
  return {rows:rows.docs.map(doc=>doc.data() as Subscription),next:rows.size===50?rows.docs.at(-1)!.id:undefined,
    active:active.data().count,pending:pending.data().count,recent:recent.data().count,queued:queued.data().count,failed:failed.data().count,sample:sample.map(sub=>sub.criteria),
    control:control.data()??null,brands,models,budgets,sampleCount:sample.length,sampled:segments.size===500};
}
export async function alertHistory(id:string){
  const [jobs,candidates]=await Promise.all([db().collection("stockAlertJobs").where("subscriptionId","==",id).orderBy("createdAt","desc").limit(20).get(),
    db().collection("stockAlertCandidates").where("subscriptionId","==",id).limit(50).get()]);
  return {jobs:jobs.docs.map(doc=>({id:doc.id,...doc.data(),tokenHashes:undefined})),candidates:candidates.docs.map(doc=>({id:doc.id,...doc.data()}))};
}
export async function administerAlert(action:"stop"|"retry",id:string,revision:number,actorUid:string,now=Date.now()){
  await db().runTransaction(async tx=>{
    const ref=db().collection(action==="stop"?"stockAlertSubscriptions":"stockAlertJobs").doc(id),snapshot=await tx.get(ref),value=snapshot.data();
    if(!value)throw new Error("Record niet beschikbaar.");
    if(action==="stop"){
      if(value.revision!==revision)throw new Error("Record is gewijzigd; vernieuw de pagina.");
      tx.update(ref,{status:"unsubscribed",revision:revision+1,confirmHash:FieldValue.delete(),updatedAt:new Date(now).toISOString(),expiresAt:new Date(now+30*86400000).toISOString()});
    }else{
      // A provider-accepted or unknown result can never be retried from the dashboard.
      if(value.state!=="failed"||value.outcome!=="rejected"||value.attempts>=3||value.revision!==revision||Date.parse(value.expiresAt)<=now)throw new Error("Deze opdracht is niet veilig opnieuw te proberen.");
      const subscription=await tx.get(db().collection("stockAlertSubscriptions").doc(value.subscriptionId));
      const sub=subscription.data();
      const eligible=value.kind==="confirmation"?sub&&["pending","active"].includes(sub.status)&&sub.confirmHash===value.tokenHashes?.confirm:sub?.status==="active"&&sub.revision===value.revision&&Date.parse(sub.validUntil)>now;
      if(!eligible)throw new Error("Inschrijving niet actief of gewijzigd.");
      tx.update(ref,{state:"queued",dueAt:new Date(now).toISOString(),dispatchStartedAt:FieldValue.delete(),leaseId:FieldValue.delete(),leaseUntil:FieldValue.delete()});
    }
    tx.create(db().collection("stockAlertAudit").doc(),{action:`admin.${action}`,entityId:id,actorUid,at:new Date(now).toISOString(),expiresAt:new Date(now+90*86400000).toISOString()});
  });
}
export async function applyProviderEvent(event:{id:string;jobId:string;messageId:string;type:"accepted"|"delivered"|"bounced"|"unsubscribed"},now=Date.now()){
  await db().runTransaction(async tx=>{
    const ref=db().collection("stockAlertWebhooks").doc(digest(event.id)),jobRef=db().collection("stockAlertJobs").doc(event.jobId);
    const [seen,snapshot]=await Promise.all([tx.get(ref),tx.get(jobRef)]);if(seen.exists)return;
    const job=snapshot.data();
    if(!job?.dispatchStartedAt||job.providerId&&job.providerId!==event.messageId)throw new Error("Unknown provider reference");
    const subscription=db().collection("stockAlertSubscriptions").doc(job.subscriptionId);
    const sub=await tx.get(subscription);
    tx.create(ref,{jobId:event.jobId,type:event.type,at:new Date(now).toISOString(),expiresAt:new Date(now+90*86400000).toISOString()});
    if(event.type==="unsubscribed"||event.type==="bounced"){
      if(sub.exists)tx.update(subscription,{status:event.type==="bounced"?"suppressed":"unsubscribed",revision:Number(sub.data()?.revision??0)+1,
        confirmHash:FieldValue.delete(),updatedAt:new Date(now).toISOString(),expiresAt:new Date(now+(event.type==="bounced"?180:30)*86400000).toISOString()});
      if(event.type==="bounced")tx.update(jobRef,{state:"bounced",providerId:event.messageId,outcome:"accepted"});
    }else if(!["delivered","bounced"].includes(job.state)){
      tx.update(jobRef,{state:event.type==="delivered"?"delivered":"provider_accepted",providerId:event.messageId,outcome:"accepted"});
    }
    // Recover accepted-but-not-recorded sends from the durable dispatch snapshot.
    for(const vehicle of job.vehicleKeys??[]){
      for(const key of vehicle.keys)tx.set(db().collection("stockAlertDeliveries").doc(digest(`${job.subscriptionId}\0${key}`)),
        {subscriptionId:job.subscriptionId,jobId:event.jobId,state:"accepted",expiresAt:new Date(now+395*86400000).toISOString()});
      tx.set(db().collection("stockAlertCandidates").doc(digest(`${job.subscriptionId}\0${vehicle.id}`)),{state:"sent"},{merge:true});
    }
  });
}
