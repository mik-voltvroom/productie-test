import "server-only";
import {NextResponse} from "next/server";
import {z} from "zod";
import {createHmac} from "node:crypto";
import {alertConfig} from "./config";
import {criteriaSchema,emailSchema,signupSchema} from "./business";
import {equalSecret} from "./tokens";
import * as repository from "./repository";
import {applyProviderEvent,administerAlert,alertHistory} from "./admin-repository";
import {authorizeApi} from "@/lib/auth/api";
import {isTrustedRequestOrigin} from "@/lib/auth/request-origin";
import {runAlertWorker} from "./service";

export const privateHeaders={"cache-control":"no-store, private","referrer-policy":"no-referrer","x-robots-tag":"noindex, nofollow"};
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:privateHeaders});
function sameOrigin(request:Request){return request.headers.get("origin")===alertConfig().origin&&isTrustedRequestOrigin(request);}
async function boundedText(request:Request){
  if(Number(request.headers.get("content-length"))>16384)throw new Error("Invalid input");
  const reader=request.body?.getReader();if(!reader)return "";
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384)throw new Error("Invalid input");chunks.push(part.value);}}
  finally{await reader.cancel();reader.releaseLock();}
  return Buffer.concat(chunks).toString("utf8");
}
async function body(request:Request){return JSON.parse(await boundedText(request));}
export async function signup(request:Request){
  if(!sameOrigin(request))return reply({ok:false,error:"Aanvraag niet toegestaan."},403);
  if(!alertConfig().signupsAvailable)return reply({ok:false,error:"De voorraadalert is nog niet beschikbaar. Probeer het later opnieuw."},503);
  try{const input=signupSchema.parse(await body(request));await repository.requestSignup(input.email,input.criteria);return reply({ok:true,message:"Controleer je e-mail om je voorraadalert te bevestigen."},202);}
  catch(error){if(error instanceof z.ZodError)return reply({ok:false,error:"Controleer je e-mailadres, wensen en toestemming."},400);return reply({ok:false,error:"Aanmelden is tijdelijk niet beschikbaar. Probeer het later opnieuw."},503);}
}
const tokenInput=z.object({token:z.string().max(100),purpose:z.enum(["confirm","manage","unsubscribe"])}).strict();
export async function access(request:Request){
  if(!sameOrigin(request))return reply({ok:false,error:"Aanvraag niet toegestaan."},403);
  try{const input=tokenInput.parse(await body(request));return reply({ok:true,...await repository.inspectToken(input.token,input.purpose)});}catch{return reply({ok:false,error:"Deze link is ongeldig of verlopen. Vraag zo nodig een nieuwe voorraadalert aan."},400);}
}
const actionInput=z.discriminatedUnion("action",[
  z.object({action:z.literal("confirm"),token:z.string().max(100)}).strict(),
  z.object({action:z.literal("unsubscribe"),token:z.string().max(100)}).strict(),
  z.object({action:z.literal("manage"),token:z.string().max(100),email:emailSchema,criteria:criteriaSchema}).strict(),
]);
export async function action(request:Request){
  if(!sameOrigin(request))return reply({ok:false,error:"Aanvraag niet toegestaan."},403);
  try{
    const input=actionInput.parse(await body(request));
    if(input.action==="confirm")await repository.confirmSignup(input.token);
    else if(input.action==="unsubscribe")await repository.stopByToken(input.token);
    else return reply({ok:true,...await repository.editByToken(input.token,{email:input.email,criteria:input.criteria})});
    return reply({ok:true});
  }catch{return reply({ok:false,error:"De actie kon niet worden verwerkt. De link kan verlopen of al gebruikt zijn."},400);}
}
export async function worker(request:Request){
  const secret=process.env.STOCK_ALERT_WORKER_SECRET??"";
  if(secret.length<32)return reply({ok:false,error:"Worker niet geconfigureerd."},503);
  if(!equalSecret(request.headers.get("authorization")??"",`Bearer ${secret}`))return reply({ok:false},401);
  try{return reply({ok:true,...await runAlertWorker()});}catch{return reply({ok:false,error:"Worker-run niet voltooid; controleer de wachtrij en configuratie."},503);}
}
const providerEvent=z.object({id:z.string().min(1).max(200),jobId:z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/),messageId:z.string().min(1).max(200),type:z.enum(["accepted","delivered","bounced","unsubscribed"])}).strict();
export async function webhook(request:Request){
  const secret=process.env.STOCK_ALERT_WEBHOOK_SECRET??"";if(secret.length<32)return reply({ok:false},503);
  const timestamp=request.headers.get("x-stock-alert-timestamp")??"",signature=request.headers.get("x-stock-alert-signature")??"";
  if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)return reply({ok:false},401);
  let raw:string;try{raw=await boundedText(request);}catch{return reply({ok:false},413);}
  const expected=createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest("hex");
  if(!equalSecret(signature,expected))return reply({ok:false},401);
  try{await applyProviderEvent(providerEvent.parse(JSON.parse(raw)));return reply({ok:true});}catch{return reply({ok:false},400);}
}
export async function admin(request:Request){
  const write=request.method==="POST",permission=write?"stockAlerts.manage":"stockAlerts.read";
  const auth=await authorizeApi(request,permission);if(auth.response)return auth.response;
  if(write&&!sameOrigin(request))return reply({ok:false},403);
  try{
    if(!write){const id=z.string().regex(/^[a-f0-9]{64}$/).parse(new URL(request.url).searchParams.get("id"));return reply({ok:true,...await alertHistory(id)});}
    const input=z.object({action:z.enum(["stop","retry"]),id:z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/),revision:z.number().int().nonnegative()}).strict().parse(await body(request));
    await administerAlert(input.action,input.id,input.revision,auth.actor!.uid);return reply({ok:true});
  }catch{return reply({ok:false,error:"Actie niet beschikbaar of record gewijzigd."},400);}
}
