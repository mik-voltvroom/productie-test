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

  it("keeps raw vehicles server-only, including published inventory", async () => {
    await seed("vehicles/available", { status: "available", make: "Volvo" });
    await seed("vehicles/reserved", { status: "reserved", reservedDealId: "deal-1" });

    const publicDb = environment.unauthenticatedContext().firestore();
    const salesDb = roleContext("sales").firestore();

    await assertFails(getDoc(doc(publicDb, "vehicles/available")));
    await assertFails(getDoc(doc(publicDb, "vehicles/reserved")));
    await assertFails(getDoc(doc(salesDb, "vehicles/reserved")));
  });

  it("denies every direct vehicle mutation, including privileged clients", async () => {
    await seed("vehicles/available", { status: "available", priceCents: 2500000, images: ["https://example.test/a.jpg"] });
    for (const role of ["owner", "admin", "sales", "marketing"]) {
      const db = roleContext(role).firestore();
      await assertFails(setDoc(doc(db, "vehicles/new"), { status: "available", priceCents: 2500000 }));
      for (const patch of [{ priceCents: 1 }, { images: [] }, { description: "override" }, { highlights: [] }, { costs: {} }, { status: "sold" }]) {
        await assertFails(updateDoc(doc(db, "vehicles/available"), patch));
      }
      await assertFails(deleteDoc(doc(db, "vehicles/available")));
    }
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
      "sohCertificates",
      "vehicleSohReports",
      "vehicles", "customers", "tasks", "leads", "leadActivities", "appointments", "quotes", "tradeIns", "leadSubmissions",
      "carCheckReports", "carCheckEvidence", "vehicleCarChecks", "customerPortalTokens", "dealPortalAccess",
      "seoState",
      "stockAlertSubscriptions", "stockAlertTokens", "stockAlertCandidates", "stockAlertJobs",
      "stockAlertAttempts", "stockAlertDeliveries", "stockAlertAudit", "stockAlertRateLimits", "stockAlertControl", "stockAlertWebhooks",
    ];

    for (const collection of collections) {
      await seed(`${collection}/record`, { status: "test" });
      await assertFails(getDoc(doc(ownerDb, collection, "record")));
      await assertFails(setDoc(doc(ownerDb, collection, "new-record"), { status: "test" }));
    }
  });

  it("keeps SOH documents inaccessible to anonymous users and every client role", async () => {
    for (const collection of ["sohCertificates", "vehicleSohReports"]) {
      await seed(`${collection}/record`, { status: "verified" });
      const contexts = [environment.unauthenticatedContext(), ...["owner", "admin", "sales", "workshop", "marketing", "finance", "readonly"].map(roleContext)];
      for (const context of contexts) {
        const db = context.firestore();
        await assertFails(getDoc(doc(db, collection, "record")));
        await assertFails(setDoc(doc(db, collection, "new"), { status: "verified" }));
        await assertFails(updateDoc(doc(db, collection, "record"), { sohPercent: 100 }));
        await assertFails(deleteDoc(doc(db, collection, "record")));
      }
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

  it("keeps all stock alert records server-only for anonymous visitors and every client role", async () => {
    const contexts = [environment.unauthenticatedContext(), ...["owner", "admin", "sales", "workshop", "marketing", "finance", "readonly"].map(roleContext)];
    for (const suffix of ["Subscriptions", "Tokens", "Candidates", "Jobs", "Attempts", "Deliveries", "Audit", "RateLimits", "Control", "Webhooks"]) {
      const collection = `stockAlert${suffix}`;
      await seed(`${collection}/record`, { status: "synthetic" });
      for (const context of contexts) {
        const db = context.firestore();
        await assertFails(getDoc(doc(db, collection, "record")));
        await assertFails(setDoc(doc(db, collection, "new"), { status: "synthetic" }));
        await assertFails(updateDoc(doc(db, collection, "record"), { status: "forged" }));
        await assertFails(deleteDoc(doc(db, collection, "record")));
      }
    }
  }, 30000);
});
