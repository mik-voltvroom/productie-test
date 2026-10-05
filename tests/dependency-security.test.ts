import { createRequire } from "node:module";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { initializeApp, deleteApp } from "firebase/app";
import { doc, getFirestore, terminate } from "firebase/firestore";
import { Firestore } from "@google-cloud/firestore";
import sharp from "sharp";

const require = createRequire(import.meta.url);

describe("security dependency compatibility (offline, no customer data)", () => {
  it.each(["google-gax", "teeny-request"])("preserves CommonJS UUID calls used by %s", owner => {
    const ownerDirectory = dirname(require.resolve(`${owner}/package.json`));
    const uuid = require(require.resolve("uuid", { paths: [ownerDirectory] }));
    expect(uuid.validate(uuid.v4())).toBe(true);
    expect(() => uuid.v5("test", uuid.v5.DNS, new Uint8Array(8))).toThrow(RangeError);
  });

  it("constructs the Firebase browser SDK without starting a network operation", async () => {
    const app = initializeApp({ projectId: "demo-dependency-smoke", apiKey: "local-test-only" }, "security-smoke");
    const database = getFirestore(app);
    try { expect(doc(database, "vehicles", "local-smoke").path).toBe("vehicles/local-smoke"); }
    finally { await terminate(database); await deleteApp(app); }
  });

  it("loads the server Firestore SDK with the patched gRPC transport without reading or writing", async () => {
    const grpc = require("@grpc/grpc-js");
    expect(grpc.credentials.createInsecure()).toBeDefined();
    const database = new Firestore({ projectId: "demo-dependency-smoke", host: "127.0.0.1:8080", ssl: false });
    try { expect(database.doc("vehicles/local-smoke").path).toBe("vehicles/local-smoke"); }
    finally { await database.terminate(); }
  });

  it("loads patched native sharp and processes a local in-memory image", async () => {
    const input = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="white"/></svg>');
    const { info } = await sharp(input).png().toBuffer({ resolveWithObject: true });
    expect(info).toMatchObject({ format: "png", width: 2, height: 2 });
  });
});
