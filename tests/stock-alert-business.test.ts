import {describe,it,expect,vi,afterEach} from "vitest";
import {criteriaSchema,signupSchema,matchesAlert,localClock,inventoryAlertCriteria,notificationKeys} from "@/lib/stock-alerts/business";
import {renderAlertMail} from "@/lib/stock-alerts/email";
import {hasPermission} from "@/lib/auth/permissions";
import type {Vehicle} from "@/types";
vi.mock('server-only',()=>({}));
import {alertConfig} from "@/lib/stock-alerts/config";
import {issueToken,tokenFromNonce,digest} from "@/lib/stock-alerts/tokens";
const car=(extra:Partial<Vehicle>={}):Vehicle=>({id:'fixture',slug:'fixture',vin:'VIN-1',brand:'Test',model:'Model',trim:'Edition',year:2022,mileageKm:0,priceCents:2000000,driveType:'plug-in-hybrid',fuelType:'Benzine',images:['https://example.test/a.jpg'],highlights:[],status:'available',publication:{channels:{website:true},validationErrors:[]},...extra} as Vehicle);
afterEach(()=>vi.unstubAllEnvs());
describe('stock alert criteria and publication',()=>{
 it('requires usable criteria or an explicit separate all-stock choice',()=>{
  expect(criteriaSchema.safeParse({}).success).toBe(false);expect(criteriaSchema.parse({allStock:true}).allStock).toBe(true);
  expect(criteriaSchema.safeParse({allStock:true,brand:'Test'}).success).toBe(false);expect(criteriaSchema.safeParse({model:'Model'}).success).toBe(false);
  expect(signupSchema.safeParse({email:'owner@example.test',criteria:{brand:'Test'},consent:false}).success).toBe(false);
  expect(signupSchema.safeParse({email:'owner@example.test',criteria:{brand:'Test'},consent:true,website:'spam'}).success).toBe(false);
 });
 it.each([{maxPriceCents:-1},{maxPriceCents:1.2},{minYear:1800},{maxMileageKm:2000001},{brand:'x'.repeat(81)},{minYear:2025,maxYear:2020},{minPriceCents:200,maxPriceCents:100}])('rejects unsafe ranges %j',value=>expect(criteriaSchema.safeParse(value).success).toBe(false));
 it('copies every active inventory constraint without widening a search',()=>{
  const initial=inventoryAlertCriteria({brand:'Test',model:'Model',driveType:'plug-in-hybrid',category:'hybrid',fuelType:'Benzine',trim:'Edition',yearFrom:'2020',yearTo:'2024',priceFrom:'10000',priceTo:'20000.50'},[car()]);
  expect(criteriaSchema.parse(initial)).toMatchObject({brand:'Test',model:'Model',driveType:'plug-in-hybrid',category:'hybrid',fuelType:'Benzine',trim:'Edition',minYear:2020,maxYear:2024,minPriceCents:1000000,maxPriceCents:2000050});
 });
 it('matches exact ranges and normalized source labels, including zero kilometres',()=>{
  const criteria=criteriaSchema.parse({brand:' test ',model:'model',drive:'hybrid',maxPriceCents:2000000,minYear:2022,maxMileageKm:0});
  expect(matchesAlert(car(),criteria)).toBe(true);expect(matchesAlert(car({priceCents:2000001}),criteria)).toBe(false);
  expect(matchesAlert(car({model:'Other'}),criteria)).toBe(false);expect(matchesAlert(car({driveType:'electric'}),criteria)).toBe(false);
 });
 it('accepts an explicit body-style criterion while rejecting source placeholders',()=>{
  expect(criteriaSchema.parse({bodyStyle:'SUV'}).bodyStyle).toBe('SUV');
  expect(criteriaSchema.safeParse({bodyStyle:' Onbekend '}).success).toBe(false);expect(criteriaSchema.safeParse({allStock:true,bodyStyle:'SUV'}).success).toBe(false);
 });
 it('matches the existing imported body style exactly and excludes missing or unknown source data',()=>{
  const criteria=criteriaSchema.parse({bodyStyle:' suv '});expect(matchesAlert(car({bodyStyle:'SUV'}),criteria)).toBe(true);
  for(const bodyStyle of [undefined,'','Onbekend','Stationwagon'])expect(matchesAlert(car({bodyStyle}),criteria)).toBe(false);
 });
 it.each(['sold','reserved','archived','review','draft'] as const)('never matches %s, even for all stock',status=>expect(matchesAlert(car({status}),criteriaSchema.parse({allStock:true}))).toBe(false));
 it('never matches hidden, invalid, image-less or source-reserved stock',()=>{
  const criteria=criteriaSchema.parse({allStock:true});
  for(const extra of [{publication:{channels:{website:false}}},{images:[]},{publication:{channels:{website:true},validationErrors:['invalid']}},{source:{inventoryStatus:'reserved'}}])expect(matchesAlert(car(extra as Partial<Vehicle>),criteria)).toBe(false);
 });
 it('rejects missing required facts and never uses a lease amount as purchase price',()=>{
  expect(matchesAlert(car({priceCents:0,monthlyPriceCents:10000}),criteriaSchema.parse({maxPriceCents:2000000}))).toBe(false);
  expect(matchesAlert(car({year:undefined}),criteriaSchema.parse({minYear:2020}))).toBe(false);
  expect(matchesAlert(car({mileageKm:undefined}),criteriaSchema.parse({maxMileageKm:50000}))).toBe(false);
  expect(notificationKeys(car())).toEqual(notificationKeys(car({slug:'changed',images:['https://example.test/new.jpg'],description:'changed'})));
 });
 it.each([['2026-03-28T08:00:00Z','2026-03-28',true],['2026-03-29T06:59:00Z','2026-03-29',false],['2026-03-29T07:00:00Z','2026-03-29',true],['2026-10-25T07:59:00Z','2026-10-25',false],['2026-10-25T08:00:00Z','2026-10-25',true],['2026-10-24T22:30:00Z','2026-10-25',false]])('uses the Dutch local day and 09:00 across DST: %s',(input,day,due)=>expect(localClock(new Date(input as string))).toEqual({day,digestDue:due}));
});
describe('tokens, configuration and templates',()=>{
 it('uses unpredictable, purpose-bound bearer tokens; stored issuance data contains only hashes and a non-bearer nonce',()=>{
  const a=issueToken('confirm','k'.repeat(64)),b=issueToken('confirm','k'.repeat(64));
  expect(a.hash).not.toBe(b.hash);expect(a).not.toHaveProperty('token');
  const raw=tokenFromNonce(a.nonce,'confirm','k'.repeat(64));expect(raw).toHaveLength(43);expect(digest(raw)).toBe(a.hash);
  expect(tokenFromNonce(a.nonce,'manage','k'.repeat(64))).not.toBe(raw);
 });
 it('defaults all flags off and blocks an unverified e-mail integration',()=>{
  expect(alertConfig({}).flags).toEqual({signups:false,matching:false,sending:false});
  expect(alertConfig({STOCK_ALERT_SIGNUPS_ENABLED:'true'}).signupsAvailable).toBe(false);
  expect(alertConfig({NEXT_PUBLIC_SITE_URL:'http://www.example.test/'}).origin).toBe('');
 });
 it('renders escaped HTML and plain text with current price, safe attribution and separate management/unsubscribe links',()=>{
  const mail=renderAlertMail({to:'synthetic@example.test',reference:'test-job',origin:'https://example.test',kind:'digest',criteria:criteriaSchema.parse({brand:'<script>x</script>'}),tokens:{manage:'m'.repeat(43),unsubscribe:'u'.repeat(43)},vehicles:[car({trim:'<script>bad</script>',vin:'PRIVATEVIN',licensePlate:'PRIVATEPLATE'})]});
  expect(mail.html).not.toContain('<script>');expect(mail.html).toContain('&lt;script&gt;');expect(mail.text).toContain('€ 20000.00');
  expect(mail.text).toContain('/beheren#token=');expect(mail.text).toContain('/uitschrijven#token=');
  expect(mail.html).not.toMatch(/PRIVATEVIN|PRIVATEPLATE/);
  expect(mail.text).toContain('utm_source=voorraadalert&utm_medium=email&utm_campaign=voorraad_matches');
 });
 it.each(['owner','admin','sales','marketing','workshop','finance','readonly'] as const)('keeps role permissions narrow for %s',role=>{
  expect(hasPermission(role,'stockAlerts.read')).toBe(['owner','admin','sales','marketing'].includes(role));
  expect(hasPermission(role,'stockAlerts.manage')).toBe(['owner','admin','sales'].includes(role));
 });
});
