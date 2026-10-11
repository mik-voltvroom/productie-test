import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SohCertificate } from "@/components/soh/SohCertificate";
import { comparableSohHistory } from "@/lib/soh/history";
import { createSohCertificate } from "@/lib/soh/business";
import type { Vehicle } from "@/types";

const vehicle = { id:'synthetic', brand:'Audi', model:'Q4 e-tron', trim:'S-Line', year:2021, mileageKm:59000, images:[], updatedAt:'2026-10-10T10:00:00Z' } as unknown as Vehicle;
const report = createSohCertificate(vehicle, { sohPercent:96.04, method:'Diagnosetest', measuredAt:'2026-10-10', expectedVehicleUpdatedAt:vehicle.updatedAt, expectedRevision:0 },
  { uid:'staff', role:'sales', email:null }, '12345678-1234-4234-8234-123456789012', '2026-10-10T12:00:00Z');
const prior = { id:'12345678-1234-4234-8234-123456789013', sohPercent:97.5, method:'Diagnosetest', measuredAt:'2026-09-10', verifiedAt:'2026-09-10T12:00:00Z' };
const render = (history = [prior]) => renderToStaticMarkup(createElement(SohCertificate, { report, history, printedAt:'2026-10-11T12:00:00Z' }));
describe('SOH layout V3', () => {
  it('renders the exact measured percentage, report identifier and print date without invented optional data', () => {
    const html = render([]);
    expect(html).toContain('96,04'); expect(html).toContain('SOH RAPPORT'); expect(html).toContain(report.id);
    expect(html).toContain('11-10-2026'); expect(html).toContain('Geen voertuigfoto aangeleverd');
    expect(html).not.toContain('Aangeleverde batterijgegevens'); expect(html).not.toContain('polyline');
    for (const text of ['Goede batterijconditie', 'Bruikbare capaciteit', 'QR', 'handtekening']) expect(html).not.toContain(text);
  });
  it('plots only real comparable historical measurements, never a forecast or calculated capacity', () => {
    expect(render()).toContain('polyline'); expect(render()).toContain('2 metingen');
    const points = comparableSohHistory(report, [prior, { ...prior, method:'Andere meetmethode' },
      { ...prior, measuredAt:'2026-10-11' }, { ...prior, sohPercent:101 }]);
    expect(points.map(point => point.sohPercent)).toEqual([97.5,96.04]);
    expect(render([{ ...prior, measuredAt:report.measuredAt }])).not.toContain('polyline');
  });
  it('keeps one latest measurement per date and reports unavailable history distinctly', () => {
    const points = comparableSohHistory(report, [prior, { ...prior, sohPercent:98, verifiedAt:'2026-09-10T13:00:00Z' }]);
    expect(points).toHaveLength(2); expect(points[0].sohPercent).toBe(98);
    expect(renderToStaticMarkup(createElement(SohCertificate, { report, historyUnavailable:true }))).toContain('momenteel niet beschikbaar');
  });
  it('renders optional source specifications only if supplied and safely escapes long names', () => {
    const html = renderToStaticMarkup(createElement(SohCertificate, { report:{ ...report, vehicle:{ ...report.vehicle,
      model:'<script>'.repeat(20), trim:'Lang model '.repeat(20), battery:[{ label:'WLTP (Mobilox-opgave)', value:'488 km' }] } } }));
    expect(html).toContain('488 km'); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
  });
});
