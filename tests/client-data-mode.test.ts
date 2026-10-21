import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalPublicMode = process.env.NEXT_PUBLIC_VVOS_DATA_MODE;

afterEach(() => {
  vi.resetModules();
  if (originalPublicMode === undefined) delete process.env.NEXT_PUBLIC_VVOS_DATA_MODE;
  else process.env.NEXT_PUBLIC_VVOS_DATA_MODE = originalPublicMode;
});

describe("VVOS client data mode", () => {
  it("binds Firebase mode into the staging browser bundle", () => {
    const hosting = readFileSync(resolve(process.cwd(), "apphosting.yaml"), "utf8");
    expect(hosting).toMatch(/variable: NEXT_PUBLIC_VVOS_DATA_MODE\r?\n\s+value: firebase/);
  });

  it("selects Firebase from the public build-time variable", async () => {
    process.env.NEXT_PUBLIC_VVOS_DATA_MODE = "firebase";
    vi.resetModules();
    const config = await import("@/lib/config");
    expect(config.integrationMode).toBe("firebase");
  });
});
