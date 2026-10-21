import { afterAll, beforeAll, expect, it } from "vitest";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { ref, uploadBytes, getBytes } from "firebase/storage";
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "")) throw new Error("Local Storage emulator required");
let environment: RulesTestEnvironment;
beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: "vvos-rules-test", storage: { rules: readFileSync("storage.rules", "utf8") } });
  await environment.withSecurityRulesDisabled(async context => {
    await uploadBytes(ref(context.storage(), "carcheck/synthetic/evidence"), new Uint8Array([1, 2, 3]));
  });
});
afterAll(async () => { await environment?.cleanup(); });
it("keeps CarCheck evidence inaccessible through the client SDK for visitors and every role", async () => {
  const contexts = [environment.unauthenticatedContext(), ...["owner", "admin", "sales", "marketing", "workshop", "finance", "readonly"].map(role => environment.authenticatedContext(`synthetic-${role}`, { role }))];
  expect(contexts).toHaveLength(8);
  for (const context of contexts) {
    await assertFails(getBytes(ref(context.storage(), "carcheck/synthetic/evidence")));
    await assertFails(uploadBytes(ref(context.storage(), "carcheck/synthetic/forged"), new Uint8Array([1])));
  }
}, 30000);
