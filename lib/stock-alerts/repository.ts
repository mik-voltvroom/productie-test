import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { alertConfig } from "./config";
import { consentText, consentVersion, notificationKeys, type AlertCriteria, type AlertJob, type Subscription, type TokenPurpose } from "./business";
import { digest, issueToken, keyedId, tokenFromNonce, validToken } from "./tokens";
import type { Vehicle } from "@/types";

const hour=3_600_000, day=24*hour;
const date=(ms:number)=>new Date(ms).toISOString();
function database(){if(!adminDb)throw new Error("Alert storage unavailable");return adminDb;}
interface TokenRecord {hash:string;nonce:string;purpose:TokenPurpose;subscriptionId:string;revision:number;expiresAt:string;usedAt?:string;replaceId?:string}
function newToken(purpose:TokenPurpose,subscriptionId:string,revision:number,now:number):TokenRecord {
  return {...issueToken(purpose,alertConfig().key),subscriptionId,revision,expiresAt:date(now+(purpose==="confirm"?2*day:purpose==="manage"?30*day:365*day))};
}
const subRef=(id:string)=>database().collection("stockAlertSubscriptions").doc(id);
const tokenRef=(hash:string)=>database().collection("stockAlertTokens").doc(hash);
const jobRef=(id:string)=>database().collection("stockAlertJobs").doc(id);
const ledgerRef=(subId:string,key:string)=>database().collection("stockAlertDeliveries").doc(digest(`${subId}\0${key}`));
const candidateRef=(subId:string,vehicleId:string)=>database().collection("stockAlertCandidates").doc(digest(`${subId}\0${vehicleId}`));
export function subscriptionId(email:string){return keyedId(email,alertConfig().key);}
function saveJob(transaction:Transaction,job:AlertJob){transaction.create(jobRef(job.id),job);}
function audit(transaction:Transaction,action:string,id:string,now:number){transaction.create(database().collection("stockAlertAudit").doc(),{action,entityId:id,at:date(now),expiresAt:date(now+90*day)});}

/** Shared durable quotas, deliberately independent of attacker-controlled forwarding headers. */
export async function requestSignup(email:string,criteria:AlertCriteria,now=Date.now(),replaceId?:string):Promise<void> {
  const db=database(),id=subscriptionId(email),ref=subRef(id),token=newToken("confirm",id,1,now);
  const daily=db.collection("stockAlertRateLimits").doc(`global-day-${Math.floor(now/day)}`);
  const hourly=db.collection("stockAlertRateLimits").doc(`global-hour-${Math.floor(now/hour)}`);
  const mailbox=db.collection("stockAlertRateLimits").doc(`mailbox-${id}-${Math.floor(now/day)}`);
  await db.runTransaction(async tx=>{
    const [existing,d,h,m]=await Promise.all([tx.get(ref),tx.get(daily),tx.get(hourly),tx.get(mailbox)]);
    const current=existing.data() as Subscription|undefined;
    if(Number(d.data()?.count??0)>=500||Number(h.data()?.count??0)>=60)throw new Error("Alert quota exhausted");
    // Same public response for a suppressed mailbox, cooldown, or an accepted new request.
    if(current?.status==="suppressed"||Number(m.data()?.count??0)>=2||now-Number(m.data()?.lastAt??0)<4*hour)return;
    token.revision=(current?.revision??0)+1;
    const active=current?.status==="active"&&Date.parse(current.validUntil??"")>now;
    const subscription:Subscription={id,email,criteria:active?current!.criteria:criteria,proposed:criteria,status:active?"active":"pending",
      revision:current?.revision??0,createdAt:current?.createdAt??date(now),updatedAt:date(now),expiresAt:active?current!.expiresAt:date(now+2*day),
      ...(active?{confirmedAt:current!.confirmedAt,validUntil:current!.validUntil}:{}),confirmHash:token.hash,
      consent:active?current!.consent:{version:consentVersion,text:consentText,at:date(now)},
      proposedConsent:{version:consentVersion,text:consentText,at:date(now)}};
    if(replaceId&&replaceId!==id)token.replaceId=replaceId;
    tx.set(ref,subscription); tx.create(tokenRef(token.hash),token);
    for(const quota of [daily,hourly])tx.set(quota,{count:Number((quota.id===daily.id?d:h).data()?.count??0)+1,expiresAt:date(now+2*day)});
    tx.set(mailbox,{count:Number(m.data()?.count??0)+1,lastAt:now,expiresAt:date(now+2*day)});
    saveJob(tx,{id:`confirmation-${token.hash}`,subscriptionId:id,kind:"confirmation",state:"queued",revision:token.revision,tokenHashes:{confirm:token.hash},attempts:0,
      createdAt:date(now),dueAt:date(now),expiresAt:date(now+2*day)});
    audit(tx,"signup.requested",id,now);
  });
}

async function credentials(tx:Transaction,raw:string,purpose:TokenPurpose,now:number) {
  if(!validToken(raw))throw new Error("Ongeldige of verlopen link.");
  const ref=tokenRef(digest(raw)),snapshot=await tx.get(ref),token=snapshot.data() as TokenRecord|undefined;
  if(!token||token.purpose!==purpose||token.usedAt||Date.parse(token.expiresAt)<=now)throw new Error("Ongeldige of verlopen link.");
  const sRef=subRef(token.subscriptionId),subscription=(await tx.get(sRef)).data() as Subscription|undefined;
  if(!subscription||(purpose==="manage"&&token.revision!==subscription.revision))throw new Error("Ongeldige of verlopen link.");
  if(purpose==="confirm"&&subscription.confirmHash!==token.hash)throw new Error("Ongeldige of verlopen link.");
  return {ref,token,sRef,subscription};
}
export async function inspectToken(raw:string,purpose:TokenPurpose,now=Date.now()) {
  return database().runTransaction(async tx=>{
    const {subscription}=await credentials(tx,raw,purpose,now);
    return {criteria:purpose==="confirm"?subscription.proposed??subscription.criteria:subscription.criteria,email:purpose==="manage"?subscription.email:undefined,status:subscription.status,revision:subscription.revision};
  },{readOnly:true});
}
export async function confirmSignup(raw:string,now=Date.now()) {
  await database().runTransaction(async tx=>{
    const {ref,token,sRef,subscription}=await credentials(tx,raw,"confirm",now);
    if(subscription.confirmHash!==token.hash||!subscription.proposed)throw new Error("Ongeldige of verlopen link.");
    const replaced=token.replaceId?await tx.get(subRef(token.replaceId)):undefined;
    if(replaced&&replaced.data()?.status!=="active")throw new Error("Deze wijziging is niet meer beschikbaar.");
    tx.update(ref,{usedAt:date(now)});
    tx.update(sRef,{status:"active",criteria:subscription.proposed,proposed:FieldValue.delete(),confirmHash:FieldValue.delete(),revision:token.revision,
      consent:subscription.proposedConsent??subscription.consent,proposedConsent:FieldValue.delete(),
      confirmedAt:date(now),validUntil:date(now+365*day),expiresAt:date(now+395*day),updatedAt:date(now)});
    if(replaced)tx.update(replaced.ref,{status:"unsubscribed",revision:Number(replaced.data()?.revision??0)+1,updatedAt:date(now),expiresAt:date(now+30*day),confirmHash:FieldValue.delete()});
    tx.set(database().collection("stockAlertControl").doc("reconcile"),{requestedAt:date(now)},{merge:true});
    audit(tx,"signup.confirmed",subscription.id,now);
  });
}
export async function stopByToken(raw:string,now=Date.now()) {
  await database().runTransaction(async tx=>{
    const {ref,sRef,subscription}=await credentials(tx,raw,"unsubscribe",now);
    tx.update(ref,{usedAt:date(now)});
    tx.update(sRef,{status:"unsubscribed",revision:subscription.revision+1,confirmHash:FieldValue.delete(),updatedAt:date(now),expiresAt:date(now+30*day)});
    audit(tx,"signup.unsubscribed",subscription.id,now);
  });
}
export async function editByToken(raw:string,input:{criteria:AlertCriteria;email:string},now=Date.now()) {
  const existing=await inspectToken(raw,"manage",now);
  const changedEmail=input.email!==existing.email;
  if(changedEmail){if(!alertConfig().signupsAvailable)throw new Error("E-mailwijziging is tijdelijk niet beschikbaar.");await requestSignup(input.email,input.criteria,now,subscriptionId(existing.email!));}
  const replacement=newToken("manage",subscriptionId(existing.email!),existing.revision+(changedEmail?0:1),now);
  await database().runTransaction(async tx=>{
    const {ref,token,sRef,subscription}=await credentials(tx,raw,"manage",now);
    if(subscription.status!=="active"||Date.parse(subscription.validUntil??"")<=now)throw new Error("Deze voorraadalert is niet actief.");
    tx.update(ref,{usedAt:date(now)});tx.create(tokenRef(replacement.hash),replacement);
    if(!changedEmail)tx.update(sRef,{criteria:input.criteria,revision:token.revision+1,updatedAt:date(now)});
    tx.set(database().collection("stockAlertControl").doc("reconcile"),{requestedAt:date(now)},{merge:true});
    audit(tx,changedEmail?"signup.email_change_requested":"signup.criteria_changed",subscription.id,now);
  });
  return {changedEmail,nextToken:tokenFromNonce(replacement.nonce,"manage",alertConfig().key)};
}

export async function activePage(cursor?:string) {
  let query=database().collection("stockAlertSubscriptions").where("status","==","active").orderBy("__name__").limit(30);
  if(cursor)query=query.startAfter(cursor);
  const snapshot=await query.get();
  return {rows:snapshot.docs.map(doc=>doc.data() as Subscription),cursor:snapshot.docs.length===30?snapshot.docs.at(-1)!.id:undefined};
}
export async function reconcileSubscription(subscription:Subscription,vehicles:Vehicle[],now:number,dayKey:string,digestDue:boolean,budget?:{now:()=>number;deadline:number}) {
  const db=database();
  // Candidate ids and notification ledgers do not depend on a mutable slug/photo/text.
  const ordered=[...vehicles].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const after=subscription.matchRevision===subscription.revision?subscription.matchAfter:undefined;
  const page=ordered.filter(vehicle=>!after||vehicle.id>after).slice(0,20);
  if(after&&!page.length)await db.runTransaction(async tx=>{const ref=subRef(subscription.id),s=await tx.get(ref);if(s.data()?.revision===subscription.revision)tx.update(ref,{matchAfter:""});});
  for(const vehicle of page){
    if(budget&&budget.now()>budget.deadline)break;
    const ref=candidateRef(subscription.id,vehicle.id);
    await db.runTransaction(async tx=>{
      const current=(await tx.get(subRef(subscription.id))).data() as Subscription|undefined;
      if(!current||current.status!=="active"||current.revision!==subscription.revision||Date.parse(current.validUntil??"")<=now)return;
      const ledgers=await Promise.all(notificationKeys(vehicle).map(key=>tx.get(ledgerRef(current.id,key))));
      tx.update(subRef(current.id),{matchRevision:current.revision,matchAfter:vehicle.id===ordered.at(-1)?.id?"":vehicle.id});
      if(!ledgers.some(row=>row.exists))tx.set(ref,{subscriptionId:current.id,vehicleId:vehicle.id,revision:current.revision,state:"pending",createdAt:date(now),expiresAt:current.expiresAt});
    });
  }
  if(!vehicles.length||!digestDue)return;
  const pending=await db.collection("stockAlertCandidates").where("subscriptionId","==",subscription.id).where("state","==","pending").where("revision","==",subscription.revision).limit(1).get();
  if(pending.empty)return;
  const id=`digest-${subscription.id}-${dayKey}`;
  await db.runTransaction(async tx=>{
    const [s,j]=await Promise.all([tx.get(subRef(subscription.id)),tx.get(jobRef(id))]);
    const current=s.data() as Subscription|undefined,old=j.data() as AlertJob|undefined;
    if(!current||current.status!=="active"||current.revision!==subscription.revision)return;
    // A changed wish may replace an unclaimed job, but never a dispatched or leased one.
    const replace=old&&!old.dispatchStartedAt&&(old.state==="queued"||old.state==="suppressed")&&old.revision!==current.revision;
    if(old&&!replace&&!(old.state==="suppressed"&&old.reason==="no_matches"&&!old.dispatchStartedAt))return;
    const manage=newToken("manage",current.id,current.revision,now),unsubscribe=newToken("unsubscribe",current.id,current.revision,now);
    const job:AlertJob={id,subscriptionId:current.id,kind:"digest",state:"queued",revision:current.revision,day:dayKey,
      tokenHashes:old&&!replace?old.tokenHashes:{manage:manage.hash,unsubscribe:unsubscribe.hash},attempts:0,createdAt:date(now),dueAt:date(now),expiresAt:date(now+90*day)};
    tx.set(jobRef(id),job);if(!old||replace){tx.create(tokenRef(manage.hash),manage);tx.create(tokenRef(unsubscribe.hash),unsubscribe);}
  });
}
export async function pendingCandidates(id:string,revision:number){
  const snapshot=await database().collection("stockAlertCandidates").where("subscriptionId","==",id).where("state","==","pending").where("revision","==",revision).limit(100).get();
  return snapshot.docs.map(doc=>({id:doc.id,...doc.data()})) as {id:string;vehicleId:string;revision:number}[];
}
export async function dueJobIds(now:number){
  const snapshot=await database().collection("stockAlertJobs").where("state","in",["queued","processing"]).where("dueAt","<=",date(now)).orderBy("dueAt").limit(20).get();
  return snapshot.docs.map(doc=>doc.id);
}
export async function claimJob(id:string,now:number):Promise<AlertJob|undefined>{
  return database().runTransaction(async tx=>{
    const ref=jobRef(id),old=(await tx.get(ref)).data() as AlertJob|undefined;
    if(!old||!["queued","processing"].includes(old.state)||Date.parse(old.dueAt)>now||(old.leaseUntil&&Date.parse(old.leaseUntil)>now))return;
    if(old.dispatchStartedAt){tx.update(ref,{state:"failed",outcome:"unknown",reason:"lease_expired_after_dispatch"});return;}
    if(Date.parse(old.expiresAt)<=now||old.attempts>=3){tx.update(ref,{state:"failed",reason:"expired_or_attempt_limit"});return;}
    const job={...old,state:"processing" as const,leaseId:randomBytes(16).toString("hex"),leaseUntil:date(now+120_000),attempts:old.attempts+1};
    tx.update(ref,job);return job;
  });
}
export async function jobContext(job:AlertJob,now:number){
  const s=(await subRef(job.subscriptionId).get()).data() as Subscription|undefined;
  if(!s)return;
  if(job.kind==="digest"&&(s.status!=="active"||s.revision!==job.revision||Date.parse(s.validUntil??"")<=now))return;
  if(job.kind==="confirmation"&&(s.confirmHash!==job.tokenHashes.confirm||!["pending","active"].includes(s.status)))return;
  const tokens:Partial<Record<TokenPurpose,string>>={};
  for(const [purpose,hash]of Object.entries(job.tokenHashes)){
    const record=(await tokenRef(hash!).get()).data() as TokenRecord|undefined;
    if(!record||record.usedAt||record.subscriptionId!==job.subscriptionId||record.purpose!==purpose||Date.parse(record.expiresAt)<=now)return;
    const raw=tokenFromNonce(record.nonce,record.purpose,alertConfig().key);
    if(digest(raw)!==hash)return;tokens[purpose as TokenPurpose]=raw;
  }
  return {subscription:s,tokens};
}
export async function unseenVehicles(subId:string,vehicles:Vehicle[]) {
  const results:Vehicle[]=[];
  for(const vehicle of vehicles){const refs=notificationKeys(vehicle).map(key=>ledgerRef(subId,key));const ledgers=await database().getAll(...refs);if(!ledgers.some(row=>row.exists))results.push(vehicle);}
  return results;
}
/** Durable dispatch boundary. Unknown outcomes are held, never automatically re-sent. */
export async function beginDispatch(job:AlertJob,vehicles:Vehicle[],now:number):Promise<boolean>{
  return database().runTransaction(async tx=>{
    const [j,s]=await Promise.all([tx.get(jobRef(job.id)),tx.get(subRef(job.subscriptionId))]);
    const current=j.data() as AlertJob|undefined,sub=s.data() as Subscription|undefined;
    if(!current||current.state!=="processing"||current.leaseId!==job.leaseId||Date.parse(current.leaseUntil??"")<=now||!sub)return false;
    if(job.kind==="digest"&&(sub.status!=="active"||sub.revision!==job.revision||Date.parse(sub.validUntil??"")<=now))return false;
    if(job.kind==="confirmation"&&(sub.confirmHash!==job.tokenHashes.confirm||!["pending","active"].includes(sub.status)))return false;
    const rows=await Promise.all(vehicles.flatMap(vehicle=>notificationKeys(vehicle).map(key=>tx.get(ledgerRef(sub.id,key)))));
    if(rows.some(row=>row.exists))return false;
    for(const vehicle of vehicles)for(const key of notificationKeys(vehicle))tx.set(ledgerRef(sub.id,key),{subscriptionId:sub.id,jobId:job.id,state:"dispatching",expiresAt:date(now+395*day)});
    tx.update(j.ref,{dispatchStartedAt:date(now),vehicleKeys:vehicles.map(vehicle=>({id:vehicle.id,keys:notificationKeys(vehicle)}))});
    tx.create(database().collection("stockAlertAttempts").doc(`${job.id}-${job.attempts}`),{jobId:job.id,subscriptionId:sub.id,state:"processing",startedAt:date(now),expiresAt:date(now+90*day)});
    return true;
  });
}
export async function finishJob(job:AlertJob,result:{outcome:"accepted"|"rejected"|"unknown";providerId?:string;retryable?:boolean},vehicles:Vehicle[],now:number){
  await database().runTransaction(async tx=>{
    const ref=jobRef(job.id),current=(await tx.get(ref)).data() as AlertJob|undefined;
    if(!current||current.leaseId!==job.leaseId||!["processing","failed"].includes(current.state))return;
    const accepted=result.outcome==="accepted";
    const reservations=await Promise.all(vehicles.flatMap(vehicle=>notificationKeys(vehicle).map(key=>tx.get(ledgerRef(job.subscriptionId,key)))));
    const retry=result.outcome==="rejected"&&result.retryable&&job.attempts<3;
    const patch={state:accepted?"provider_accepted":retry?"queued":"failed",outcome:result.outcome,
      ...(result.providerId?{providerId:result.providerId}:{}),leaseUntil:FieldValue.delete(),leaseId:FieldValue.delete(),
      ...(retry?{dispatchStartedAt:FieldValue.delete(),dueAt:date(now+Math.pow(2,job.attempts)*60_000)}:{})};
    tx.update(ref,patch);
    tx.update(database().collection("stockAlertAttempts").doc(`${job.id}-${job.attempts}`),{state:patch.state,outcome:result.outcome,finishedAt:date(now),...(result.providerId?{providerId:result.providerId}:{})});
    if(accepted)for(const vehicle of vehicles){
      for(const key of notificationKeys(vehicle))tx.set(ledgerRef(job.subscriptionId,key),{subscriptionId:job.subscriptionId,jobId:job.id,acceptedAt:date(now),expiresAt:date(now+395*day)});
      tx.set(candidateRef(job.subscriptionId,vehicle.id),{state:"sent"},{merge:true});
    }
    if(result.outcome==="rejected")for(const reservation of reservations)if(reservation.data()?.jobId===job.id)tx.delete(reservation.ref);
    audit(tx,`mail.${result.outcome}`,job.id,now);
  });
}
export async function suppressJob(job:AlertJob,reason:string){
  await database().runTransaction(async tx=>{const ref=jobRef(job.id),current=(await tx.get(ref)).data();if(current?.state==="processing"&&current.leaseId===job.leaseId&&!current.dispatchStartedAt)tx.update(ref,{state:"suppressed",reason,leaseId:FieldValue.delete(),leaseUntil:FieldValue.delete()});});
}
export async function checkpoint(cursor:string|undefined,now:number){await database().collection("stockAlertControl").doc("reconcile").set({cursor:cursor??null,lastReconciledAt:date(now)},{merge:true});}
export async function workerSuccess(now:number,counts:Record<string,number>){await database().collection("stockAlertControl").doc("reconcile").set({lastSuccessfulRun:date(now),counts},{merge:true});}
export async function readCheckpoint(){return (await database().collection("stockAlertControl").doc("reconcile").get()).data();}
export async function cleanup(now:number){
  let removed=0;
  const staleActive=await database().collection("stockAlertSubscriptions").where("status","==","active").where("validUntil","<=",date(now)).limit(30).get();
  for(const doc of staleActive.docs)await database().runTransaction(async tx=>{const current=await tx.get(doc.ref);if(current.data()?.status==="active"&&Date.parse(current.data()?.validUntil??"")<=now)tx.update(doc.ref,{status:"expired",confirmHash:FieldValue.delete(),expiresAt:date(now+30*day),updatedAt:date(now)});});
  for(const name of ["Subscriptions","Tokens","Candidates","Jobs","Attempts","Deliveries","Audit","RateLimits","Webhooks"]){
    const expired=await database().collection(`stockAlert${name}`).where("expiresAt","<=",date(now)).limit(30).get();
    if(expired.empty)continue;const batch=database().batch();expired.docs.forEach(doc=>batch.delete(doc.ref));await batch.commit();removed+=expired.size;
  }
  return removed;
}
