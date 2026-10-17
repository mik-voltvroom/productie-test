import {beforeEach,afterAll,describe,it,expect,vi} from "vitest";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import type {Vehicle} from "@/types";
if(!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST??''))throw new Error('Local emulator required');
const app=initializeApp({projectId:'vvos-rules-test'},'stock-alert-tests'),db=getFirestore(app);
vi.setConfig({testTimeout:30000,hookTimeout:30000});
vi.mock('server-only',()=>({}));vi.mock('@/lib/firebase-admin',()=>({get adminDb(){return db;}}));
import * as repo from '@/lib/stock-alerts/repository';
import {runAlertWorker} from '@/lib/stock-alerts/service';
import {tokenFromNonce} from '@/lib/stock-alerts/tokens';
import {criteriaSchema,type AlertJob} from '@/lib/stock-alerts/business';
import {administerAlert,applyProviderEvent} from '@/lib/stock-alerts/admin-repository';
import type {AlertMail} from '@/lib/stock-alerts/email';
const names=['Subscriptions','Tokens','Candidates','Jobs','Attempts','Deliveries','Audit','RateLimits','Control','Webhooks'];
let time=Date.parse('2026-10-17T07:00:00Z'),stock:Vehicle[]=[],mails:AlertMail[]=[];
const fixture=(id='car',extra:Partial<Vehicle>={}):Vehicle=>({id,slug:id,vin:`VIN-${id}`,brand:'Test',model:'Model',trim:'Edition',year:2022,mileageKm:0,priceCents:2000000,status:'available',driveType:'electric',images:['https://example.test/a.jpg'],highlights:[],publication:{channels:{website:true},validationErrors:[]},...extra} as Vehicle);
const provider={send:vi.fn(async(mail:AlertMail)=>{mails.push(mail);return {outcome:'accepted' as const,providerId:`provider-${mails.length}`};})};
const run=(inventory=async()=>stock)=>runAlertWorker({inventory,mailer:provider,now:()=>time});
async function active(criteria=criteriaSchema.parse({brand:'Test'})){
 await repo.requestSignup('synthetic@example.test',criteria,time);await run();
 expect(mails).toHaveLength(1);const raw=mails[0].text.match(/bevestigen#token=([\w-]+)/)![1];await repo.confirmSignup(raw,time);
 return {id:repo.subscriptionId('synthetic@example.test'),raw};
}
async function digestJob(){return (await db.collection('stockAlertJobs').where('kind','==','digest').get()).docs.map(doc=>doc.data() as AlertJob).at(-1)!;}
async function unsubscribeRaw(){const job=await digestJob();const token=(await db.collection('stockAlertTokens').doc(job.tokenHashes.unsubscribe!).get()).data()!;return tokenFromNonce(token.nonce,'unsubscribe','k'.repeat(64));}
beforeEach(async()=>{
 for(const name of names)await db.recursiveDelete(db.collection(`stockAlert${name}`));
 for(const [key,value]of Object.entries({STOCK_ALERT_SIGNUPS_ENABLED:'true',STOCK_ALERT_MATCHING_ENABLED:'true',STOCK_ALERT_SENDING_ENABLED:'true',STOCK_ALERT_EMAIL_CONTRACT:'gateway-v1',STOCK_ALERT_FROM_EMAIL:'alerts@example.test',EMAIL_API_URL:'https://gateway.example.test/send',EMAIL_API_KEY:'synthetic-test-key',STOCK_ALERT_TOKEN_SECRET:'k'.repeat(64),STOCK_ALERT_WORKER_SECRET:'w'.repeat(64),NEXT_PUBLIC_SITE_URL:'https://example.test',STOCK_ALERT_MAX_VEHICLES_PER_EMAIL:'5'}))vi.stubEnv(key,value);
 time=Date.parse('2026-10-17T07:00:00Z');stock=[fixture()];mails=[];provider.send.mockClear();provider.send.mockImplementation(async mail=>{mails.push(mail);return {outcome:'accepted',providerId:`provider-${mails.length}`};});
});
afterAll(async()=>{vi.unstubAllEnvs();await db.terminate();await deleteApp(app);});
describe('durable stock alert workflow',()=>{
 it('does not alert before DOI; viewing a token is read-only, confirmation is one-use',async()=>{
  await repo.requestSignup('synthetic@example.test',criteriaSchema.parse({brand:'Test'}),time);await run();expect(mails).toHaveLength(1);expect(mails[0].subject).toContain('Bevestig');
  const raw=mails[0].text.match(/bevestigen#token=([\w-]+)/)![1];await repo.inspectToken(raw,'confirm',time);
  expect((await db.collection('stockAlertSubscriptions').get()).docs[0].data().status).toBe('pending');await run();expect(mails).toHaveLength(1);
  await repo.confirmSignup(raw,time);await expect(repo.confirmSignup(raw,time)).rejects.toThrow();await run();expect(mails).toHaveLength(2);expect(mails[1].subject).toBe('Er staat een auto voor je klaar bij Volt & Vroom');
 });
 it('expires tokens and caps confirmation resends without exposing whether an address already exists',async()=>{
  await repo.requestSignup('synthetic@example.test',criteriaSchema.parse({brand:'Test'}),time);await repo.requestSignup('synthetic@example.test',criteriaSchema.parse({brand:'Other'}),time+1000);
  expect((await db.collection('stockAlertJobs').get()).size).toBe(1);await run();const raw=mails[0].text.match(/bevestigen#token=([\w-]+)/)![1];
  await expect(repo.confirmSignup(raw,time+49*3600000)).rejects.toThrow();
 });
 it('includes existing matching stock, observes the local 09:00 boundary, and never repeats a slug/photo/import change',async()=>{
  time=Date.parse('2026-10-17T06:59:00Z');await active();await run();expect(mails).toHaveLength(1);
  time+=60000;await run();expect(mails).toHaveLength(2);stock=[fixture('car',{slug:'new-slug',images:['https://example.test/new.jpg']})];await run();expect(mails).toHaveLength(2);
  time+=86400000;await run();expect(mails).toHaveLength(2);
 });
 it('notifies a newly affordable vehicle exactly once and preserves the notification across a new source ID with the same VIN',async()=>{
  stock=[fixture('expensive',{priceCents:2200000})];await active(criteriaSchema.parse({maxPriceCents:2000000}));await run();expect(mails).toHaveLength(1);
  stock=[fixture('expensive',{priceCents:1900000})];await run();expect(mails).toHaveLength(2);
  time+=86400000;stock=[fixture('new-source-id',{vin:'VIN-expensive',priceCents:1800000})];await run();expect(mails).toHaveLength(2);
 });
 it('rechecks publication and availability between reconciliation and sending',async()=>{
  await active();let reads=0;await run(async()=>++reads===1?stock:[fixture('car',{status:'sold'})]);expect(mails).toHaveLength(1);
  expect((await digestJob()).state).toBe('suppressed');
 });
 it('suppresses a queued/claimed digest when the subscriber unsubscribes before dispatch',async()=>{
  await active();let reads=0;await run(async()=>{if(++reads===2)await repo.stopByToken(await unsubscribeRaw(),time);return stock;});
  expect(mails).toHaveLength(1);expect((await digestJob()).state).toBe('suppressed');
 });
 it('allows only one concurrent sender and keeps remaining candidates for later local days',async()=>{
  stock=Array.from({length:5},(_,i)=>fixture(`car-${i}`));vi.stubEnv('STOCK_ALERT_MAX_VEHICLES_PER_EMAIL','2');await active();
  await Promise.all([run(),run()]);expect(mails).toHaveLength(2);expect(mails[1].text.match(/\/voorraad\/[^\s]+\?utm_source=voorraadalert/g)).toHaveLength(2);
  time+=86400000;await run();expect(mails).toHaveLength(3);time+=86400000;await run();expect(mails).toHaveLength(4);time+=86400000;await run();expect(mails).toHaveLength(4);
 },30000);
 it('holds accepted-but-unrecorded messages across lease expiry and later calendar days',async()=>{
  await active();const finish=vi.spyOn(repo,'finishJob').mockRejectedValueOnce(new Error('synthetic crash after provider accepted'));
  await expect(run()).rejects.toThrow('synthetic crash');finish.mockRestore();expect(mails).toHaveLength(2);
  const job=await digestJob();expect(job.dispatchStartedAt).toBeTruthy();time+=121000;expect(await repo.claimJob(job.id,time)).toBeUndefined();
  await expect(administerAlert('retry',job.id,job.revision,'synthetic-staff',time)).rejects.toThrow('niet veilig');
  time+=86400000;await run();expect(mails).toHaveLength(2);
  await applyProviderEvent({id:'event-recover',jobId:job.id,messageId:'provider-2',type:'delivered'},time);
  expect((await db.collection('stockAlertJobs').doc(job.id).get()).data()?.state).toBe('delivered');
 });
 it('retries only definite rejections after backoff and permits a safe staff retry without bypassing DOI',async()=>{
  await active();let calls=0;
  const mailer={send:vi.fn(async()=>++calls===1?{outcome:'rejected' as const,retryable:true}:{outcome:'accepted' as const,providerId:'retry-accepted'})};
  const invoke=()=>runAlertWorker({inventory:async()=>stock,mailer,now:()=>time});
  await invoke();expect((await digestJob()).state).toBe('queued');await invoke();expect(calls).toBe(1);
  time+=121000;await invoke();expect(calls).toBe(2);expect((await digestJob()).state).toBe('provider_accepted');
  time+=86400000;stock=[fixture('second')];const rejected={send:vi.fn(async()=>({outcome:'rejected' as const,retryable:false}))};
  await runAlertWorker({inventory:async()=>stock,mailer:rejected,now:()=>time});const job=await digestJob();expect(job.state).toBe('failed');
  await administerAlert('retry',job.id,job.revision,'synthetic-staff',time);await invoke();expect((await digestJob()).state).toBe('provider_accepted');
 });
 it('makes pre-dispatch leases reclaimable, fences stale workers and honours stopping from VVOS',async()=>{
  const {id}=await active();vi.stubEnv('STOCK_ALERT_SENDING_ENABLED','false');await run();const job=await digestJob();
  const first=await repo.claimJob(job.id,time);time+=121000;const second=await repo.claimJob(job.id,time);expect(first?.leaseId).not.toBe(second?.leaseId);
  expect(await repo.beginDispatch(first!,stock,time)).toBe(false);await administerAlert('stop',id,1,'synthetic-staff',time);
  expect(await repo.beginDispatch(second!,stock,time)).toBe(false);
 });
 it('rotates management tokens and requires a separate DOI when the e-mail address changes',async()=>{
  const {id}=await active();await run();const raw=mails[1].text.match(/beheren#token=([\w-]+)/)![1];
  const updated=await repo.editByToken(raw,{email:'synthetic@example.test',criteria:criteriaSchema.parse({brand:'Other'})},time);
  expect(updated.changedEmail).toBe(false);await expect(repo.inspectToken(raw,'manage',time)).rejects.toThrow();
  await repo.editByToken(updated.nextToken,{email:'changed@example.test',criteria:criteriaSchema.parse({brand:'New'})},time);
  const other=await db.collection('stockAlertSubscriptions').doc(repo.subscriptionId('changed@example.test')).get();expect(other.data()?.status).toBe('pending');expect((await db.collection('stockAlertSubscriptions').doc(id).get()).data()?.status).toBe('active');
 });
 it('preserves confirmed consent until the replacement request is confirmed',async()=>{
  const {id}=await active();const ref=db.collection('stockAlertSubscriptions').doc(id),before=(await ref.get()).data()!;
  time+=5*3600000;await repo.requestSignup('synthetic@example.test',criteriaSchema.parse({brand:'Other'}),time);
  const pending=(await ref.get()).data()!;expect(pending.consent).toEqual(before.consent);expect(pending.criteria.brand).toBe('Test');expect(pending.proposedConsent.at).not.toBe(before.consent.at);
  await run();const token=mails.filter(mail=>mail.subject.includes('Bevestig')).at(-1)!.text.match(/bevestigen#token=([\w-]+)/)![1];expect((await repo.inspectToken(token,'confirm',time)).criteria.brand).toBe('Other');await repo.confirmSignup(token,time);
  const confirmed=(await ref.get()).data()!;expect(confirmed.consent).toEqual(pending.proposedConsent);expect(confirmed.criteria.brand).toBe('Other');
 });
 it('replaces an undispatched daily job after changed criteria with current management tokens',async()=>{
  const {id}=await active();vi.stubEnv('STOCK_ALERT_SENDING_ENABLED','false');await run();const old=await digestJob();
  await db.collection('stockAlertSubscriptions').doc(id).update({revision:2,criteria:criteriaSchema.parse({drive:'electric'})});
  await run();const replaced=await digestJob();expect(replaced.id).toBe(old.id);expect(replaced.revision).toBe(2);expect(replaced.tokenHashes.manage).not.toBe(old.tokenHashes.manage);
  vi.stubEnv('STOCK_ALERT_SENDING_ENABLED','true');await run();expect(mails).toHaveLength(2);
  const raw=mails[1].text.match(/beheren#token=([\w-]+)/)![1];expect((await repo.inspectToken(raw,'manage',time)).revision).toBe(2);
 });
 it('verifies provider references, deduplicates callbacks, suppresses bounces and removes expired contact data',async()=>{
  const {id}=await active();await run();const job=await digestJob();const event={id:'bounce',jobId:job.id,messageId:job.providerId!,type:'bounced' as const};
  await applyProviderEvent(event,time);await applyProviderEvent(event,time);expect((await db.collection('stockAlertWebhooks').get()).size).toBe(1);
  expect((await db.collection('stockAlertSubscriptions').doc(id).get()).data()?.status).toBe('suppressed');
  await expect(applyProviderEvent({...event,id:'forged-ref',messageId:'wrong'},time)).rejects.toThrow();
  await repo.cleanup(time+181*86400000);expect((await db.collection('stockAlertSubscriptions').doc(id).get()).exists).toBe(false);
 });
});
