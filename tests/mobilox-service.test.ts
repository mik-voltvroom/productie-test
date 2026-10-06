import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ data: new Map<string, any>(), writes: [] as any[] }));
vi.mock('@/lib/firebase-admin', () => {
  function doc(path: string): any { return { path, id: path.split('/').at(-1), get: async () => ({ exists: mock.data.has(path), data: () => mock.data.get(path) }) }; }
  return { adminDb: { doc, collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`), where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) }),
    runTransaction: async (fn: any) => {
      const pending: any[] = [];
      await fn({ get: (ref: any) => ref.get(), set: (ref: any, data: any, options: any) => pending.push({ ref, data, options }) });
      for (const write of pending) { mock.writes.push(write); mock.data.set(write.ref.path, write.options?.merge ? { ...mock.data.get(write.ref.path), ...write.data } : write.data); }
    } } };
});
import { processHexonInventoryXml } from '@/lib/integrations/hexon-service';
import { POST as vwe } from '@/app/api/vwe/import/route';
const photo = 'https://media-eigenwebsiteincrementeel.export.dv.nl/test.jpg';
const xml = `<voertuig><voertuignr_hexon>service-test</voertuignr_hexon><merk>Test</merk><model>Test</model><type>Test</type><bouwjaar>2022</bouwjaar><tellerstand>0</tellerstand><brandstof>E</brandstof><verkoopprijs_particulier>100</verkoopprijs_particulier><advertentietekst>New</advertentietekst><afbeeldingen><afbeelding><url>${photo}</url></afbeelding></afbeeldingen></voertuig>`;
beforeEach(() => { mock.data.clear(); mock.writes.length = 0; });
describe('Mobilox database replacement', () => {
  it('replaces full source state and writes the event atomically; duplicates are no-ops', async () => {
    mock.data.set('vehicles/hexon-service-test', { id: 'hexon-service-test', priceCents: 50000, images: ['old'], description: 'Old', powerKw: 99, raw: { secret: 'old' }, publication: { channels: { website: false, merchant: true }, publicImageUrls: [] }, updatedAt: 'old', createdAt: 'old' });
    const first = await processHexonInventoryXml(xml);
    expect(first.duplicate).toBe(false);
    const vehicle = mock.data.get('vehicles/hexon-service-test');
    expect(vehicle.images).toEqual([photo]); expect(vehicle.description).toBe('New');
    expect(vehicle).not.toHaveProperty('powerKw'); expect(vehicle).not.toHaveProperty('raw');
    expect(vehicle.publication.channels).toMatchObject({ website: true, merchant: true });
    expect(mock.writes.find(write => write.ref.path.startsWith('vehicles/')).options).toBeUndefined();
    expect((await processHexonInventoryXml(xml)).duplicate).toBe(true);
    expect(mock.writes).toHaveLength(2);
  });
  it('accepts a legitimate return to an earlier payload after another update', async () => {
    await processHexonInventoryXml(xml);
    await processHexonInventoryXml(xml.replace('>New<', '>Changed<'));
    expect((await processHexonInventoryXml(xml)).duplicate).toBe(false);
    expect(mock.data.get('vehicles/hexon-service-test').description).toBe('New');
  });
  it('leaves the entire current record and event store unchanged on invalid photos or malformed payloads', async () => {
    mock.data.set('vehicles/hexon-service-test', { description: 'keep' });
    await expect(processHexonInventoryXml(xml.replace(photo, 'https://evil.test/a.jpg'))).rejects.toThrow('fotolijst');
    await expect(processHexonInventoryXml(xml.replace('<tellerstand>0</tellerstand>', ''))).rejects.toThrow('kilometerstand');
    expect(mock.writes).toEqual([]);
    expect(mock.data.get('vehicles/hexon-service-test')).toEqual({ description: 'keep' });
  });
  it('does not erase an active deal on provider deletion', async () => {
    mock.data.set('vehicles/hexon-service-test', { status: 'reserved', reservedDealId: 'deal-1' });
    await processHexonInventoryXml('<voertuig actie="delete" voertuignr_hexon="service-test"/>');
    expect(mock.data.get('vehicles/hexon-service-test')).toMatchObject({ status: 'reserved', reservedDealId: 'deal-1', publication: { channels: { website: false } } });
  });
  it('never writes through the retired VWE route even with credentials and a payload', async () => {
    process.env.VWE_WEBHOOK_SECRET = 'test-only';
    try {
      const response = await vwe(new Request('https://example.test/api/vwe/import', { method: 'POST', headers: { 'x-vvos-secret': 'test-only' }, body: JSON.stringify([{ id: 'test', images: ['override'] }]) }));
      expect(response.status).toBe(410); expect(mock.writes).toEqual([]);
    } finally { delete process.env.VWE_WEBHOOK_SECRET; }
  });
});
