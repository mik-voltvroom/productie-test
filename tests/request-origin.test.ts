import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTrustedRequestOrigin } from "@/lib/auth/request-origin";
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.example.test"));
afterEach(() => vi.unstubAllEnvs());
const request = (origin?:string, headers:Record<string,string> = {}) => new Request("http://internal:8080/api/vvos/vehicles/car/soh", {
  method:"POST", headers:{ ...(origin === undefined ? {} : { origin }), ...headers },
});
describe("Proxy-safe request origin", () => {
  it("accepts the configured external HTTPS origin after TLS termination", () => {
    expect(isTrustedRequestOrigin(request("https://site.example.test", { "sec-fetch-site":"same-origin" }))).toBe(true);
    expect(isTrustedRequestOrigin(request("http://internal:8080"))).toBe(true);
  });
  it.each([undefined, "null", "https://evil.test", "https://site.example.test.evil.test", "http://site.example.test", "https://site.example.test/path", "https://site.example.test:8443"])("rejects untrusted origin %s", origin => {
    expect(isTrustedRequestOrigin(request(origin, { "x-forwarded-host":"evil.test", "x-forwarded-proto":"https" }))).toBe(false);
  });
  it("cannot trust forged forwarded headers or cross-site fetch metadata", () => {
    expect(isTrustedRequestOrigin(request("https://evil.test", { host:"evil.test", "x-forwarded-host":"evil.test", "x-forwarded-proto":"https" }))).toBe(false);
    expect(isTrustedRequestOrigin(request("https://site.example.test", { "sec-fetch-site":"cross-site" }))).toBe(false);
  });
  it("uses the current environment rather than a hard-coded production hostname", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.test");
    expect(isTrustedRequestOrigin(request("https://site.example.test"))).toBe(false);
    expect(isTrustedRequestOrigin(request("https://staging.example.test"))).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(isTrustedRequestOrigin(request("https://staging.example.test"))).toBe(false);
  });
});
