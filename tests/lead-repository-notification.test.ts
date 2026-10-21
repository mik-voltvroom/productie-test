import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ setDoc: vi.fn().mockResolvedValue(undefined), doc: vi.fn().mockReturnValue("lead-ref") }));
vi.mock("@/lib/firebase-client", () => ({ db: {} }));
vi.mock("@/lib/config", () => ({ integrationMode: "firebase" }));
vi.mock("firebase/firestore", () => ({ ...mocks, collection: vi.fn(), getDocs: vi.fn(), orderBy: vi.fn(), query: vi.fn() }));
import { saveLead } from "@/lib/repositories/lead-repository";

it("does not overwrite server notification status when staff changes a lead", async () => {
  await saveLead({ id: "LEAD-test", name: "Synthetic", channel: "website", consent: true, status: "contacted", notification: { status: "pending", updatedAt: "2026-10-12T07:00:00Z" } });
  expect(mocks.setDoc).toHaveBeenCalledExactlyOnceWith("lead-ref", {
    id: "LEAD-test", name: "Synthetic", channel: "website", consent: true, status: "contacted",
  }, { merge: true });
});
