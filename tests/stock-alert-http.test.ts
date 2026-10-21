import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {createHmac} from 'node:crypto';
const mock=vi.hoisted(()=>({signup:vi.fn(),inspect:vi.fn(),confirm:vi.fn(),stop:vi.fn(),edit:vi.fn(),event:vi.fn(),worker:vi.fn(),auth:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/stock-alerts/repository',()=>({requestSignup:mock.signup,inspectToken:mock.inspect,confirmSignup:mock.confirm,stopByToken:mock.stop,editByToken:mock.edit}));
vi.mock('@/lib/stock-alerts/admin-repository',()=>({applyProviderEvent:mock.event,administerAlert:vi.fn(),alertHistory:vi.fn()}));
vi.mock('@/lib/stock-alerts/service',()=>({runAlertWorker:mock.worker}));
vi.mock('@/lib/auth/api',()=>({authorizeApi:mock.auth}));
import {signup,action,access,worker,webhook,admin} from '@/lib/stock-alerts/http';
import {gatewayMailer} from '@/lib/stock-alerts/provider';
const request=(path:string,input:unknown,headers:Record<string,string>={})=>new Request(`https://example.test${path}`,{method:'POST',headers:{origin:'https://example.test','content-type':'application/json',...headers},body:JSON.stringify(input)});
beforeEach(()=>{
 vi.clearAllMocks();
 for(const [key,value]of Object.entries({NEXT_PUBLIC_SITE_URL:'https://example.test',STOCK_ALERT_SIGNUPS_ENABLED:'true',STOCK_ALERT_MATCHING_ENABLED:'true',STOCK_ALERT_SENDING_ENABLED:'true',STOCK_ALERT_FROM_EMAIL:'alerts@example.test',STOCK_ALERT_TOKEN_SECRET:'k'.repeat(64),STOCK_ALERT_WORKER_SECRET:'w'.repeat(64),STOCK_ALERT_WEBHOOK_SECRET:'h'.repeat(64),EMAIL_API_URL:'https://gateway.example.test/send',EMAIL_API_KEY:'synthetic-key',STOCK_ALERT_EMAIL_CONTRACT:'gateway-v1'}))vi.stubEnv(key,value);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('public and machine HTTP boundaries',()=>{
 it('keeps public responses generic for new, repeated and rate-limited mailboxes',async()=>{
  const payload={email:'synthetic@example.test',criteria:{brand:'Test'},consent:true,website:''};
  const first=await signup(request('/api/public/stock-alerts',payload));const second=await signup(request('/api/public/stock-alerts',payload));
  expect(first.status).toBe(202);expect(await first.json()).toEqual(await second.json());expect(first.headers.get('cache-control')).toContain('no-store');
 });
 it('fails closed on missing configuration, cross-site requests and malformed criteria',async()=>{
  vi.stubEnv('STOCK_ALERT_SENDING_ENABLED','false');expect((await signup(request('/api/public/stock-alerts',{}))).status).toBe(503);expect(mock.signup).not.toHaveBeenCalled();
  vi.stubEnv('STOCK_ALERT_SENDING_ENABLED','true');expect((await signup(request('/api/public/stock-alerts',{}, {origin:'https://attacker.test'}))).status).toBe(403);
  expect((await signup(request('/api/public/stock-alerts',{email:'synthetic@example.test',criteria:{},consent:true}))).status).toBe(400);
 });
 it('separates read-only access from explicit POST confirmation',async()=>{
  mock.inspect.mockResolvedValue({status:'pending'});const raw='a'.repeat(43);
  await access(request('/api/public/stock-alerts/access',{token:raw,purpose:'confirm'}));expect(mock.confirm).not.toHaveBeenCalled();
  await action(request('/api/public/stock-alerts/action',{token:raw,action:'confirm'}));expect(mock.confirm).toHaveBeenCalledWith(raw);
 });
 it('accepts the configured origin behind an internal hosting URL without trusting forwarded headers',async()=>{
  mock.inspect.mockResolvedValue({status:'pending'});
  const proxied=new Request('http://internal-host:8080/api/public/stock-alerts/access',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify({token:'a'.repeat(43),purpose:'confirm'})});
  expect((await access(proxied)).status).toBe(200);
  expect((await access(request('/api/public/stock-alerts/access',{token:'a'.repeat(43),purpose:'confirm'},{origin:'https://attacker.test','x-forwarded-host':'example.test'}))).status).toBe(403);
  expect((await access(request('/api/public/stock-alerts/access',{token:'a'.repeat(43),purpose:'confirm'},{'sec-fetch-site':'cross-site'}))).status).toBe(403);
 });
 it('bounds public request bodies before processing private records',async()=>{
  const response=await action(request('/api/public/stock-alerts/action',{action:'confirm',token:'a'.repeat(20000)}));
  expect(response.status).toBe(400);expect(mock.confirm).not.toHaveBeenCalled();
 });
 it('authenticates worker and staff endpoints before work',async()=>{
  expect((await worker(request('/api/stock-alerts/worker',{}))).status).toBe(401);expect(mock.worker).not.toHaveBeenCalled();
  mock.worker.mockResolvedValue({paused:true});expect((await worker(request('/api/stock-alerts/worker',{}, {authorization:`Bearer ${'w'.repeat(64)}`}))).status).toBe(200);
  mock.auth.mockResolvedValue({actor:null,response:new Response(null,{status:403})});expect((await admin(request('/api/vvos/stock-alerts',{}))).status).toBe(403);expect(mock.auth).toHaveBeenCalledWith(expect.anything(),'stockAlerts.manage');
 });
 it('verifies timestamped raw webhook signatures before processing an event',async()=>{
  const payload={id:'evt',jobId:'job',messageId:'provider',type:'delivered'},timestamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256','h'.repeat(64)).update(`${timestamp}.${JSON.stringify(payload)}`).digest('hex');
  expect((await webhook(request('/api/stock-alerts/webhook',payload,{'x-stock-alert-timestamp':timestamp,'x-stock-alert-signature':'bad'}))).status).toBe(401);expect(mock.event).not.toHaveBeenCalled();
  expect((await webhook(request('/api/stock-alerts/webhook',payload,{'x-stock-alert-timestamp':timestamp,'x-stock-alert-signature':signature}))).status).toBe(200);expect(mock.event).toHaveBeenCalledWith(payload);
 });
 it('never leaks private error details into public responses or logging',async()=>{
  const error=vi.spyOn(console,'error');mock.confirm.mockRejectedValue(new Error('synthetic@example.test TOKEN PRIVATE_URL'));
  const response=await action(request('/api/public/stock-alerts/action',{action:'confirm',token:'a'.repeat(43)}));expect(JSON.stringify(await response.json())).not.toMatch(/synthetic@example|TOKEN|PRIVATE_URL/);expect(error).not.toHaveBeenCalled();error.mockRestore();
 });
});
describe('explicit gateway contract',()=>{
 const mail={to:'synthetic@example.test',subject:'Synthetic',html:'<p>Synthetic</p>',text:'Synthetic',reference:'job-1'};
 it('requires a real accepted response with provider reference',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({accepted:true,messageId:'msg-1'}),{status:202}));vi.stubGlobal('fetch',fetch);
  expect(await gatewayMailer.send(mail)).toEqual({outcome:'accepted',providerId:'msg-1'});expect(fetch.mock.calls[0][1].headers['idempotency-key']).toBe('job-1');
 });
 it('holds timeouts, ambiguous 200s and malformed replies instead of fabricating success or retrying',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(new Response('{}',{status:200})).mockRejectedValueOnce(new Error('synthetic timeout'));vi.stubGlobal('fetch',fetch);
  expect(await gatewayMailer.send(mail)).toEqual({outcome:'unknown'});expect(await gatewayMailer.send(mail)).toEqual({outcome:'unknown'});expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('distinguishes an explicitly rejected retryable response',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({accepted:false,retryable:true}),{status:429})));
  expect(await gatewayMailer.send(mail)).toEqual({outcome:'rejected',retryable:true});
 });
});
