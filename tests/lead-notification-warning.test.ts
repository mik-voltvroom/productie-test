import { describe, expect, it } from "vitest";
import { notificationOutcome, notificationWarning } from "@/lib/communications/business";

describe("staff notification warnings", () => {
  it.each(["pending", "failed", "not_configured"] as const)("shows actionable warning for %s", status => {
    expect(notificationWarning({ channel: "website", notification: { status } })).toContain("VVOS");
  });
  it("does not invent successful delivery for old website leads", () => {
    expect(notificationWarning({ channel: "website" })).toContain("onbekend");
    expect(notificationWarning({ channel: "phone" })).toBeNull();
    expect(notificationWarning({ channel: "website", notification: { status: "sent" } })).toBeNull();
  });
  it("requires a positively acknowledged delivery", () => {
    expect(notificationOutcome({ configured: true, sent: 0, failed: 0 })).toBe("failed");
    expect(notificationOutcome({ configured: true, sent: 1, failed: 1 })).toBe("failed");
    expect(notificationOutcome({ configured: false, sent: 0, failed: 0 })).toBe("not_configured");
    expect(notificationOutcome({ configured: true, sent: 1, failed: 0 })).toBe("sent");
  });
});
