import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Vehicle } from "@/types";
import { buildVehicleLookup } from "@/lib/vehicle-lookup/business";

// This suite must never use ADC or contact a live project.
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '')) throw new Error('Local Firestore emulator required');
const app = initializeApp({ projectId: 'vvos-rules-test' }, 'public-lookup-tests');
const db = getFirestore(app);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase-admin', () => ({ get adminDb() { return db; } }));
import { getPublicVehicleBySlug, getPublicVehicleById, listPublicVehicles, PublicInventoryUnavailable } from '@/lib/repositories/public-vehicle-repository';

const fixture = (id: string, extra: Partial<Vehicle> = {}): Vehicle => {
  const car = { id, slug:id, vin:`TEST${id}`, brand:'Test', model:'Fixture', trim:'Test', year:2022, mileageKm:0, priceCents:1000000, status:'available',
    updatedAt:'2026-10-01', images:['https://example.test/a.jpg'], highlights:[], publication:{channels:{website:true}, validationErrors:[]}, ...extra } as Vehicle;
  car.publicLookup = buildVehicleLookup(undefined, car); return car;
};
async function save(...cars: Vehicle[]) {
  for (let offset = 0; offset < cars.length; offset += 250) {
    const batch = db.batch(); cars.slice(offset, offset + 250).forEach(car => batch.set(db.collection('vehicles').doc(car.id), car)); await batch.commit();
  }
}
beforeEach(async () => {
  vi.stubEnv('VVOS_ENV', 'production'); vi.stubEnv('VVOS_DATA_MODE', 'firebase');
  await db.recursiveDelete(db.collection('vehicles'));
  await db.collection('seoState').doc('publicVehicleLookup').set({state:'ready',version:1});
});
afterAll(async () => { vi.unstubAllEnvs(); await db.terminate(); await deleteApp(app); });
describe('real Firestore public lookup queries', () => {
  it('plans without writes, rejects a stale plan, and activates only after verified metadata coverage', async () => {
    const directory = mkdtempSync(join(tmpdir(),'vv-lookup-'));
    const plan = join(directory,'plan.json');
    const car = fixture('migration'); delete car.publicLookup; await save(car);
    const run = (...extra: string[]) => execFileSync(process.execPath,['scripts/vehicle-lookup-migration.mjs','--project','vvos-rules-test','--plan',plan,...extra],{
      encoding:'utf8', timeout:20000, stdio:'pipe', env:{...process.env, GOOGLE_CLOUD_PROJECT:'vvos-rules-test',FIREBASE_ADMIN_PROJECT_ID:'vvos-rules-test',FIREBASE_ADMIN_CLIENT_EMAIL:'',FIREBASE_ADMIN_PRIVATE_KEY:''},
    });
    try {
      expect(run()).toContain('dry-run'); expect(JSON.parse(readFileSync(plan,'utf8')).records).toHaveLength(1);
      expect((await db.collection('vehicles').doc(car.id).get()).data()).toEqual(car);
      await db.collection('vehicles').doc(car.id).update({priceCents:2000000});
      expect(() => run('--apply','--writers-deployed','0'.repeat(40))).toThrow();
      expect((await db.collection('vehicles').doc(car.id).get()).data()).not.toHaveProperty('publicLookup');
      run(); expect(run('--apply','--writers-deployed','0'.repeat(40))).toContain('applied');
      const data = (await db.collection('vehicles').doc(car.id).get()).data()!;
      expect(data).toMatchObject({priceCents:2000000, updatedAt:car.updatedAt,publicLookup:{version:1}});
      expect((await db.collection('seoState').doc('publicVehicleLookup').get()).data()).toMatchObject({state:'ready',version:1,verifiedCount:1});
      expect((await getPublicVehicleBySlug('migration'))?.priceCents).toBe(2000000);
    } finally { rmSync(directory,{recursive:true,force:true}); }
  },60000);
  it('queries aliases and full transitive normalized identity components in one read-only transaction', async () => {
    const a = fixture('A',{vin:'VIN-1',licensePlate:'PLATE1',updatedAt:'2026-10-03'});
    const b = fixture('B',{vin:'vin1',licensePlate:'PLATE-2',updatedAt:'2026-10-02'});
    const c = fixture('C',{vin:'VIN2',licensePlate:'plate2',slug:'current-c'}); c.publicLookup!.slugs.push('old-c');
    await save(c,b,a);
    expect((await getPublicVehicleBySlug('old-c'))?.id).toBe('C');
    expect(await getPublicVehicleById('B')).toBeUndefined();
    expect((await listPublicVehicles()).map(car => car.id)).toEqual(['A','C']);
    expect(await getPublicVehicleBySlug('unknown')).toBeUndefined();
  });
  it('falls back until verified coverage, retaining observed aliases on the legacy path', async () => {
    await db.collection('seoState').doc('publicVehicleLookup').delete();
    const car = fixture('legacy',{slug:'current'}); car.publicLookup!.slugs.push('previous'); await save(car);
    expect((await getPublicVehicleBySlug('previous'))?.slug).toBe('current');
    await db.collection('seoState').doc('publicVehicleLookup').set({state:'building',version:1});
    expect((await getPublicVehicleById('legacy'))?.id).toBe('legacy');
  });
  it('matches global winners for tied timestamps and more than one inventory page', async () => {
    const cars = Array.from({length:251},(_,i)=>fixture(`car-${String(i).padStart(4,'0')}`,{vin:`VIN${i}`}));
    cars[250].vin = cars[0].vin; cars[250].publicLookup = buildVehicleLookup(undefined,cars[250]); await save(...cars);
    expect(await getPublicVehicleBySlug(cars[250].slug)).toBeUndefined();
    expect((await getPublicVehicleById(cars[0].id))?.id).toBe(cars[0].id);
    expect(await listPublicVehicles()).toHaveLength(250);
  });
  it('withdraws old links and fails explicitly on ambiguous or inconsistent indexed data', async () => {
    const car = fixture('a',{slug:'current'}); car.publicLookup!.slugs.push('old'); await save(car);
    await db.collection('vehicles').doc('a').update({'publication.channels.website':false});
    expect(await getPublicVehicleBySlug('old')).toBeUndefined();
    await db.collection('vehicles').doc('a').update({'publication.channels.website':true});
    const other = fixture('b'); other.publicLookup!.slugs.push('old'); await save(other);
    await expect(getPublicVehicleBySlug('old')).rejects.toBeInstanceOf(PublicInventoryUnavailable);
    await db.collection('vehicles').doc('a').update({'publicLookup.identityKeys':['forged']});
    await expect(getPublicVehicleById('a')).rejects.toBeInstanceOf(PublicInventoryUnavailable);
  });
});
