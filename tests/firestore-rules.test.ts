import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "vvos-rules-test";
let environment: RulesTestEnvironment;

function roleContext(role: string): RulesTestContext {
  return environment.authenticatedContext(`${role}-user`, { role });
}

async function seed(path: string, data: Record<string, unknown>) {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

describe("Firestore Rules commercial boundaries", () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await environment.clearFirestore();
  });

  afterAll(async () => {
    await environment.cleanup();
  });

  it("keeps raw vehicles staff-only, including published inventory", async () => {
    await seed("vehicles/available", { status: "available", make: "Volvo" });
    await seed("vehicles/reserved", { status: "reserved", reservedDealId: "deal-1" });

    const publicDb = environment.unauthenticatedContext().firestore();
    const salesDb = roleContext("sales").firestore();

    await assertFails(getDoc(doc(publicDb, "vehicles/available")));
    await assertFails(getDoc(doc(publicDb, "vehicles/reserved")));
    await assertSucceeds(getDoc(doc(salesDb, "vehicles/reserved")));
  });

  it("allows ordinary inventory maintenance but denies client-side reservation and sale", async () => {
    const salesDb = roleContext("sales").firestore();
    const ownerDb = roleContext("owner").firestore();
    const adminDb = roleContext("admin").firestore();

    await assertSucceeds(setDoc(doc(salesDb, "vehicles/draft"), { status: "draft", make: "Kia", priceCents: 2_500_000 }));
    await assertFails(setDoc(doc(salesDb, "vehicles/legacy-money"), { status: "draft", make: "Kia", priceEur: 25_000 }));
    await assertFails(setDoc(doc(salesDb, "vehicles/fractional-cents"), { status: "draft", make: "Kia", priceCents: 2_500_000.5 }));
    await assertSucceeds(setDoc(doc(salesDb, "vehicles/commercial-model"), {
      status: "draft",
      make: "Audi",
      priceCents: 3_199_000,
      commercial: { targetMarginCents: 300_000, maxStockDays: 45, viewCount: 0, leadCount: 0, priceHistory: [] },
    }));
    await assertFails(setDoc(doc(salesDb, "vehicles/fractional-commercial-money"), {
      status: "draft",
      make: "Audi",
      priceCents: 3_199_000,
      commercial: { targetMarginCents: 299_999.5, maxStockDays: 45, viewCount: 0, leadCount: 0, priceHistory: [] },
    }));
    await assertFails(setDoc(doc(salesDb, "vehicles/reserved-create"), {
      status: "reserved",
      reservedDealId: "deal-1",
      priceCents: 2_500_000,
    }));

    await seed("vehicles/available", { status: "available", make: "Volvo", priceCents: 2_500_000 });
    await assertSucceeds(updateDoc(doc(salesDb, "vehicles/available"), { make: "Polestar" }));
    await assertFails(updateDoc(doc(ownerDb, "vehicles/available"), {
      status: "reserved",
      reservedDealId: "deal-1",
      reservedAt: "2026-08-18T00:00:00.000Z",
    }));

    await seed("vehicles/reserved", { status: "reserved", reservedDealId: "deal-1" });
    await assertFails(updateDoc(doc(adminDb, "vehicles/reserved"), { status: "available" }));
    await assertFails(deleteDoc(doc(adminDb, "vehicles/reserved")));
    await assertSucceeds(deleteDoc(doc(ownerDb, "vehicles/draft")));
  });

  it("keeps editorial mutations on the server", async () => {
    const ownerDb = roleContext("owner").firestore();
    await assertFails(setDoc(doc(ownerDb, "vehicles/editorial-create"), { status: "draft", priceCents: 100, editorial: { version: 1 } }));
    await seed("vehicles/editorial-existing", { status: "available", priceCents: 100, editorial: { revision: 1 } });
    await assertFails(updateDoc(doc(ownerDb, "vehicles/editorial-existing"), { editorial: { revision: 2 } }));
    await assertSucceeds(updateDoc(doc(ownerDb, "vehicles/editorial-existing"), { priceCents: 200 }));
  });

  it("keeps every Commercial Core collection server-only", async () => {
    const ownerDb = roleContext("owner").firestore();
    const collections = [
      "deals",
      "dealSnapshots",
      "deliveryTasks",
      "payments",
      "dealDocuments",
      "financeApplications",
      "socialVideos",
    ];

    for (const collection of collections) {
      await seed(`${collection}/record`, { status: "test" });
      await assertFails(getDoc(doc(ownerDb, collection, "record")));
      await assertFails(setDoc(doc(ownerDb, collection, "new-record"), { status: "test" }));
    }
  });

  it("allows audit reads only to owner and admin and denies every client write", async () => {
    await seed("audit_logs/event", { action: "deal.signed" });
    const ownerDb = roleContext("owner").firestore();
    const adminDb = roleContext("admin").firestore();
    const salesDb = roleContext("sales").firestore();

    await assertSucceeds(getDoc(doc(ownerDb, "audit_logs/event")));
    await assertSucceeds(getDoc(doc(adminDb, "audit_logs/event")));
    await assertFails(getDoc(doc(salesDb, "audit_logs/event")));
    await assertFails(setDoc(doc(ownerDb, "audit_logs/client-event"), { action: "forged" }));
  });
});
