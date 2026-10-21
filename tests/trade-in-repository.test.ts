import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const batchSet = vi.fn();
  const batchCommit = vi.fn();
  const fileSave = vi.fn();
  const fileDelete = vi.fn();
  const file = vi.fn((path: string) => ({
    path,
    save: fileSave,
    delete: fileDelete,
  }));
  return {
    batchSet,
    batchCommit,
    fileSave,
    fileDelete,
    file,
    adminDb: {
      batch: vi.fn(() => ({ set: batchSet, commit: batchCommit })),
      collection: vi.fn((collection: string) => ({ doc: (id: string) => `${collection}/${id}` })),
    },
    adminStorage: { bucket: vi.fn(() => ({ file })) },
  };
});

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: mocks.adminDb,
  adminStorage: mocks.adminStorage,
}));

import { removeUndefinedValues } from "@/lib/firestore-data";
import { persistTradeInRequest } from "@/lib/repositories/trade-in-repository";

function input(photos: File[] = []) {
  return {
    leadId: "LEAD-test",
    tradeInId: "INR-test",
    photos,
    lead: {
      name: "Testpersoon",
      email: undefined,
      phone: "0612345678",
      sales: { score: 10, optional: undefined },
    },
    tradeIn: {
      licensePlate: "AB12CD",
      year: undefined,
      damage: undefined,
      options: undefined,
      desiredVehicleId: undefined,
    },
  };
}

describe("persistTradeInRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.fileSave.mockResolvedValue(undefined);
    mocks.fileDelete.mockResolvedValue(undefined);
  });

  it("schrijft lead en inruil atomair zonder undefined-waarden", async () => {
    await persistTradeInRequest(input());

    expect(mocks.batchSet).toHaveBeenCalledTimes(2);
    expect(mocks.batchCommit).toHaveBeenCalledOnce();
    expect(mocks.batchSet.mock.calls[0]).toEqual([
      "leads/LEAD-test",
      {
        id: "LEAD-test",
        name: "Testpersoon",
        phone: "0612345678",
        sales: { score: 10 },
      },
    ]);
    expect(mocks.batchSet.mock.calls[1]).toEqual([
      "tradeIns/INR-test",
      { id: "INR-test", licensePlate: "AB12CD", photos: [] },
    ]);
  });

  it("bewaart geldige Firestore-typen zonder JSON-serialisatie", () => {
    const date = new Date("2026-09-29T10:00:00.000Z");
    const sdkValue = Object.create({ firestoreType: true }) as object;

    const cleaned = removeUndefinedValues({ date, sdkValue, optional: undefined });

    expect(cleaned).toEqual({ date, sdkValue });
    expect(cleaned.date).toBe(date);
    expect(cleaned.sdkValue).toBe(sdkValue);
  });

  it("uploadt foto's privé en koppelt alleen hun opslagpaden", async () => {
    const photo = new File(["photo"], "auto.jpg", { type: "image/jpeg" });

    const result = await persistTradeInRequest(input([photo]));

    expect(mocks.fileSave).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({
      resumable: false,
      validation: "crc32c",
      metadata: expect.objectContaining({
        contentType: "image/jpeg",
        cacheControl: "private, no-store",
      }),
    }));
    expect(result.photoPaths).toHaveLength(1);
    expect(mocks.batchSet.mock.calls[1][1].photos).toEqual(result.photoPaths);
  });

  it("ruimt reeds geüploade foto's op wanneer de atomische write mislukt", async () => {
    mocks.batchCommit.mockRejectedValueOnce(new Error("commit failed"));
    const photo = new File(["photo"], "auto.jpg", { type: "image/jpeg" });

    await expect(persistTradeInRequest(input([photo]))).rejects.toThrow("commit failed");

    expect(mocks.fileDelete).toHaveBeenCalledOnce();
    expect(mocks.fileDelete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });
});
