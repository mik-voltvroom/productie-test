import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";

const SessionRequestSchema = z.object({
  idToken: z.string().min(100).max(10000),
});

export async function POST(request: Request) {
  if (!adminAuth) {
    return NextResponse.json(
      { ok: false, mode: "demo", message: "Firebase Admin is niet geconfigureerd." },
      { status: 503 }
    );
  }

  try {
    const body = SessionRequestSchema.parse(await request.json());
    const decoded = await adminAuth.verifyIdToken(body.idToken, true);
    if (!decoded.email) {
      return NextResponse.json({ ok: false, message: "Account heeft geen geldig e-mailadres." }, { status: 403 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const cookie = await adminAuth.createSessionCookie(body.idToken, { expiresIn });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("vvos_session", cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return response;
  } catch (error) {
    const message = error instanceof z.ZodError ? "Ongeldige sessieaanvraag." : "Inloggen is mislukt.";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }
}
