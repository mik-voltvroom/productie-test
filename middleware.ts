import { NextRequest, NextResponse } from "next/server";
import { isPublicRoute } from "@/lib/routing/access";
import { isLocalDemoAuthBypassAllowed } from "@/lib/auth/config";

export function middleware(request: NextRequest) {
  if (isLocalDemoAuthBypassAllowed() || isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!request.cookies.get("vvos_session")) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Niet ingelogd." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
