import { afterEach, describe, expect, it } from "vitest";
import { GET as runCron } from "@/app/api/cron/sync/route";
import { POST as importVwe } from "@/app/api/vwe/import/route";
import { POST as importHexon } from "@/app/api/hexon/inventory/route";

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.VWE_WEBHOOK_SECRET;
  delete process.env.HEXON_SYNC_USERNAME;
  delete process.env.HEXON_SYNC_PASSWORD;
});

describe("service hooks fail closed", () => {
  it("rejects cron when no secret is configured", async () => {
    const response = await runCron(new Request("https://staging.voltvroom.nl/api/cron/sync"));
    expect(response.status).toBe(503);
  });

  it("rejects an invalid cron bearer token", async () => {
    process.env.CRON_SECRET = "a-secure-staging-cron-secret";
    const response = await runCron(new Request("https://staging.voltvroom.nl/api/cron/sync", {
      headers: { authorization: "Bearer wrong" },
    }));
    expect(response.status).toBe(401);
  });

  it("permanently rejects VWE inventory imports", async () => {
    const response = await importVwe(new Request("https://staging.voltvroom.nl/api/vwe/import", {
      method: "POST",
      body: JSON.stringify({ vehicles: [] }),
    }));
    expect(response.status).toBe(410);
  });

  it("rejects Hexon imports when dedicated credentials are not configured", async () => {
    const response = await importHexon(new Request("https://staging.voltvroom.nl/api/hexon/inventory", {
      method: "POST",
      headers: { "content-type": "application/xml" },
      body: "<voertuig />",
    }));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("0");
  });

  it("rejects invalid Hexon basic authentication", async () => {
    process.env.HEXON_SYNC_USERNAME = "hexon-staging";
    process.env.HEXON_SYNC_PASSWORD = "a-dedicated-staging-only-password";
    const response = await importHexon(new Request("https://staging.voltvroom.nl/api/hexon/inventory", {
      method: "POST",
      headers: { "content-type": "application/xml", authorization: "Basic Zm9vOmJhcg==" },
      body: "<voertuig />",
    }));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("0");
  });

  it("does not acknowledge Hexon persistence when Firebase Admin is unavailable", async () => {
    process.env.HEXON_SYNC_USERNAME = "hexon-staging";
    process.env.HEXON_SYNC_PASSWORD = "a-dedicated-staging-only-password";
    const authorization = `Basic ${Buffer.from(`${process.env.HEXON_SYNC_USERNAME}:${process.env.HEXON_SYNC_PASSWORD}`).toString("base64")}`;
    const response = await importHexon(new Request("https://staging.voltvroom.nl/api/hexon/inventory", {
      method: "POST",
      headers: { "content-type": "application/xml", authorization },
      body: "<voertuig />",
    }));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("0");
  });
});
