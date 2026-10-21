import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("security headers", () => {
  it("applies transport and browser hardening to every route", async () => {
    const routes = await nextConfig.headers?.();
    const headers = new Map(routes?.[0]?.headers.map(({ key, value }) => [key, value]));
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("base-uri 'self'");
    expect(headers.get("Content-Security-Policy")).toContain("form-action 'self'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });
});
