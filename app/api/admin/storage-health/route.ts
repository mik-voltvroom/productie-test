import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeApi(request, "integrations.manage");
  if (authorization.response) return authorization.response;
  if (!authorization.actor || !["owner", "admin"].includes(authorization.actor.role)) {
    return NextResponse.json({ ok: false, error: "Alleen owner/admin mag Storage IAM valideren." }, { status: 403 });
  }
  if (!adminStorage) {
    return NextResponse.json({ ok: false, error: "Firebase Storage runtime is niet beschikbaar." }, { status: 503 });
  }

  const bucket = adminStorage.bucket();
  const objectName = `health/storage-runtime/${Date.now()}-${crypto.randomUUID()}.png`;
  const file = bucket.file(objectName);

  try {
    await file.save(PNG_1X1, {
      resumable: false,
      validation: "crc32c",
      metadata: {
        contentType: "image/png",
        cacheControl: "no-store",
        metadata: { source: "vvos-storage-iam-healthcheck" },
      },
    });

    const [downloaded] = await file.download();
    if (!downloaded.equals(PNG_1X1)) {
      throw new Error("Storage read-back kwam niet overeen met de geschreven testdata.");
    }

    await file.delete();

    return NextResponse.json({
      ok: true,
      bucket: bucket.name,
      checks: { create: true, read: true, delete: true },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    await file.delete({ ignoreNotFound: true }).catch(() => undefined);
    return NextResponse.json({
      ok: false,
      bucket: bucket.name,
      error: error instanceof Error ? error.message : "Onbekende Storage IAM-fout.",
      checkedAt: new Date().toISOString(),
    }, { status: 503 });
  }
}
