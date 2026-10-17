import "server-only";
import {createHash,createHmac,randomBytes,timingSafeEqual} from "node:crypto";
import type {TokenPurpose} from "./business";
export const digest = (value:string) => createHash("sha256").update(value).digest("hex");
export function keyedId(value:string,key:string):string { return createHmac("sha256",key).update(value).digest("hex"); }
export function equalSecret(left:string,right:string):boolean { const a=Buffer.from(left),b=Buffer.from(right); return a.length===b.length && timingSafeEqual(a,b); }
/** Random issuance nonce is not a bearer credential. Only hashes of bearer tokens are stored.
 * The dedicated secret permits deferred mail rendering without storing raw or encrypted tokens. */
export function tokenFromNonce(nonce:string,purpose:TokenPurpose,key:string):string {
  return createHmac("sha256",key).update(`stock-alert-v1\0${purpose}\0${nonce}`).digest("base64url");
}
export function issueToken(purpose:TokenPurpose,key:string) {
  const nonce=randomBytes(32).toString("hex"),token=tokenFromNonce(nonce,purpose,key);
  return {nonce,purpose,hash:digest(token)};
}
export const validToken=(token:unknown):token is string => typeof token==="string" && /^[A-Za-z0-9_-]{43}$/.test(token);
