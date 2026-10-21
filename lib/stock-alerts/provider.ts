import "server-only";
import {alertConfig} from "./config";
import type {AlertMail} from "./email";
export interface MailOutcome {outcome:"accepted"|"rejected"|"unknown";providerId?:string;retryable?:boolean}
export interface AlertMailer {send(mail:AlertMail):Promise<MailOutcome>}
/** Existing EMAIL_API_* settings identify an integration, not a verified provider contract.
 * Enable only after an operator has verified the gateway-v1 request/response and callback contract. */
export const gatewayMailer:AlertMailer={async send(mail){
  const config=alertConfig();
  if(!config.configured||!config.flags.sending)return {outcome:"rejected",retryable:false};
  try {
    const response=await fetch(config.endpoint,{method:"POST",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10_000),
      headers:{authorization:`Bearer ${process.env.EMAIL_API_KEY}`,"content-type":"application/json","idempotency-key":mail.reference},
      body:JSON.stringify({from:config.from,...mail})});
    const reader=response.body?.getReader();if(!reader)return {outcome:"unknown"};
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>65536){await reader.cancel();return {outcome:"unknown"};}chunks.push(part.value);}
    const result=JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if(response.ok&&result.accepted===true&&typeof result.messageId==="string"&&/^[A-Za-z0-9_.:@/-]{1,200}$/.test(result.messageId))return {outcome:"accepted",providerId:result.messageId};
    if(!response.ok&&result.accepted===false&&typeof result.retryable==="boolean")return {outcome:"rejected",retryable:result.retryable};
    return {outcome:"unknown"};
  }catch{return {outcome:"unknown"};}
}};
