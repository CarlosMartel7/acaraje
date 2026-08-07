import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";
import { tryGetAuthSecret } from "@/lib/auth/config";

const LOGIN_PATH = "/login";

function isAuthApi(pathname: string): boolean {
  return (
    pathname === "/api/acaraje/auth/login" ||
    pathname === "/api/acaraje/auth/logout" ||
    pathname === "/api/acaraje/auth/session" ||
    pathname.startsWith("/api/acaraje/auth/")
  );
}

function isProtectedPage(pathname: string): boolean {
  return pathname === "/acaraje" || pathname.startsWith("/acaraje/");
}

function isProtectedApi(pathname: string): boolean {
  return pathname.startsWith("/api/acaraje/") && !isAuthApi(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = tryGetAuthSecret();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = secret ? await verifySessionToken(token, secret) : null;

  if (pathname === LOGIN_PATH) {
    if (session) {
      return NextResponse.redirect(new URL("/acaraje/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedApi(pathname)) {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedPage(pathname)) {
    if (!session) {
      const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/acaraje/:path*", "/api/acaraje/:path*"],
};
