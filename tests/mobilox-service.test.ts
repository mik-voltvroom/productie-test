import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
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
  it('reprocesses an unchanged payload after the road-tax parser version changes', async () => {
    const amount = (field: string, value: number) => `<${field}><prijs nr="1"><bedrag>${value}</bedrag><munteenheid>EUR</munteenheid></prijs></${field}>`;
    const payload = xml.replace('</voertuig>', `<motorrijtuigen_belasting>${amount('maand_min', 66)}${amount('maand_max', 72)}${amount('kwartaal_min', 198)}${amount('kwartaal_max', 216)}</motorrijtuigen_belasting></voertuig>`);
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    const oldEventHash = createHash('sha256').update(`7-mobilox-practice-range\0${payload}`).digest('hex');
    mock.data.set(`integrationEvents/hexon-${oldEventHash}`, { payloadSha256: payloadHash });
    mock.data.set('vehicles/hexon-service-test', { source: { payloadSha256: payloadHash }, roadTax: { quarterlyMinCents: 6600, quarterlyMaxCents: 6600, source: 'mobilox-hexon' } });
    expect((await processHexonInventoryXml(payload)).duplicate).toBe(false);
    expect(mock.data.get('vehicles/hexon-service-test').roadTax).toMatchObject({ quarterlyMinCents: 19800, quarterlyMaxCents: 21600, monthlyMinCents: 6600, monthlyMaxCents: 7200, schemaVersion: 2 });
    expect((await processHexonInventoryXml(payload)).duplicate).toBe(true);
  });
  it('synchronizes and clears practice range with the own identification source field', async () => {
    await processHexonInventoryXml(xml.replace('</voertuig>', '<voertuignr_klant>320</voertuignr_klant></voertuig>'));
    expect(mock.data.get('vehicles/hexon-service-test').realisticRangeKm).toBe(320);
    await processHexonInventoryXml(xml.replace('</voertuig>', '<voertuignr_klant>385</voertuignr_klant></voertuig>'));
    expect(mock.data.get('vehicles/hexon-service-test').realisticRangeKm).toBe(385);
    await processHexonInventoryXml(xml);
    expect(mock.data.get('vehicles/hexon-service-test').realisticRangeKm).toBeUndefined();
  });
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
  it('rejects omitted source sections atomically but accepts explicit empty sections', async () => {
    const full = xml.replace('</voertuig>', '<opties><optie>Camera</optie></opties></voertuig>');
    await processHexonInventoryXml(full);
    const before = JSON.stringify([...mock.data]);
    const writes = mock.writes.length;
    for (const omitted of [
      full.replace(/<afbeeldingen>[\s\S]*?<\/afbeeldingen>/, ''),
      full.replace('<advertentietekst>New</advertentietekst>', ''),
      full.replace('<opties><optie>Camera</optie></opties>', ''),
    ]) {
      await expect(processHexonInventoryXml(omitted)).rejects.toThrow('Onvolledige Mobilox');
      expect(JSON.stringify([...mock.data])).toBe(before);
      expect(mock.writes).toHaveLength(writes);
    }
    await processHexonInventoryXml(full
      .replace(/<afbeeldingen>[\s\S]*?<\/afbeeldingen>/, '<afbeeldingen/>')
      .replace('<advertentietekst>New</advertentietekst>', '<advertentietekst/>')
      .replace('<opties><optie>Camera</optie></opties>', '<opties/>'));
    const current = mock.data.get('vehicles/hexon-service-test');
    expect(current.images).toEqual([]);
    expect(current.highlights).toEqual([]);
    expect(current.description).toBeUndefined();
    expect(current.publication.channels.website).toBe(false);
  });
  it('publishes hybrids without inventing missing battery health or consumption', async () => {
    await processHexonInventoryXml(xml.replace('<brandstof>E</brandstof>', '<brandstof>H</brandstof>'));
    const current = mock.data.get('vehicles/hexon-service-test');
    expect(current.status).toBe('available');
    expect(current.publication.channels.website).toBe(true);
    expect(current.batteryHealthPercent).toBeUndefined();
    expect(current.consumptionPer100Km).toBeUndefined();
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

