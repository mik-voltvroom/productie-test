import { describe, expect, it } from "vitest";
import { normalizeHexonIntegrationEvent } from "@/lib/integrations/hexon-events";

describe("Hexon integration event normalization", () => {
  it("recognizes current Mobilox/Hexon events and exposes image failures", () => {
    expect(normalizeHexonIntegrationEvent("event-1", {
      provider: "mobilox-hexon",
      externalId: "57134262",
      type: "vehicle.add",
      receivedAt: "2026-10-02T17:11:33.260Z",
      result: "accepted_with_image_warnings",
      imageFailures: [{
        sourceUrl: "https://media.example.test/57134262-1.jpg",
        message: "The specified bucket does not exist.",
      }],
    })).toEqual({
      id: "event-1",
      provider: "mobilox-hexon",
      externalId: "57134262",
      type: "vehicle.add",
      receivedAt: "2026-10-02T17:11:33.260Z",
      processedAt: null,
      result: "accepted_with_image_warnings",
      imageFailures: [{ message: "The specified bucket does not exist." }],
    });
  });

  it("supports legacy event field names and ignores unrelated providers", () => {
    expect(normalizeHexonIntegrationEvent("legacy", {
      provider: "mobilox",
      sourceVehicleId: "42",
      processedAt: "2026-09-01T10:00:00.000Z",
    })?.externalId).toBe("42");
    expect(normalizeHexonIntegrationEvent("other", { provider: "vwe" })).toBeNull();
  });
});
