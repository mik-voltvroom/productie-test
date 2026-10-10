import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VehicleRangePanel } from "@/components/dashboard/VehicleRangePanel";
import { ShowroomCard } from "@/components/dashboard/ShowroomCard";
import { vehicles } from "@/lib/sample-data";

describe("Internal range fields", () => {
  it("renders separate labelled inputs with Mobilox defaults and manual reset controls", () => {
    const vehicle = { ...vehicles[0], wltpRangeKm:418, realisticRangeKm:320 };
    const render = (value: typeof vehicle) => renderToStaticMarkup(createElement(VehicleRangePanel, { vehicle:value, onChange:() => {} }));
    const source = render(vehicle);
    expect(source).toContain('WLTP (km)'); expect(source).toContain('Praktijkbereik (km)');
    expect(source).toContain('value="418"'); expect(source).toContain('value="320"');
    const manual = render({ ...vehicle, rangeOverrides:{ wltpRangeKm:400, realisticRangeKm:300 } });
    expect(manual).toContain('value="400"'); expect(manual).toContain('value="300"');
    expect(manual).toContain('Mobilox-waarde gebruiken');
  });
  it("renders the same saved values on the internal showroom card", () => {
    const markup = renderToStaticMarkup(createElement(ShowroomCard, { vehicle:{ ...vehicles[0], wltpRangeKm:418, realisticRangeKm:320,
      rangeOverrides:{ wltpRangeKm:400, realisticRangeKm:300 } } }));
    expect(markup).toContain('400 km'); expect(markup).toContain('300 km');
    expect(markup).not.toContain('418 km'); expect(markup).not.toContain('320 km');
  });
});
