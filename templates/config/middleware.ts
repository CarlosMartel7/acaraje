import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server")
const NextResponse = imp("NextResponse@next/server")
const SESSION_COOKIE = imp("SESSION_COOKIE@@/lib/auth/session-token")
const verifySessionToken = imp("verifySessionToken@@/lib/auth/session-token")
const tryGetAuthSecret = imp("tryGetAuthSecret@@/lib/auth/config")

/** @param projectName the sanitized project name — see `templates/lib/acaraje-routes.ts`. */
export const writeMiddleware = (projectName: string) => code`
const LOGIN_PATH = "/login";
const ACARAJE_BASE = "/${projectName}";

function isAuthApi(pathname: string): boolean {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/session" ||
    pathname.startsWith("/api/auth/")
  );
}

function isProtectedPage(pathname: string): boolean {
  return pathname === ACARAJE_BASE || pathname.startsWith(\`\${ACARAJE_BASE}/\`);
}

function isProtectedApi(pathname: string): boolean {
  return pathname.startsWith("/api/") && !isAuthApi(pathname);
}

export async function middleware(request: ${NextRequest}) {
  const { pathname } = request.nextUrl;
  const secret = ${tryGetAuthSecret}();
  const token = request.cookies.get(${SESSION_COOKIE})?.value;
  const session = secret ? await ${verifySessionToken}(token, secret) : null;

  if (pathname === LOGIN_PATH) {
    if (session) {
      return ${NextResponse}.redirect(new URL(\`\${ACARAJE_BASE}/dashboard\`, request.url));
    }
    return ${NextResponse}.next();
  }

  if (isProtectedApi(pathname)) {
    if (!session) {
      return ${NextResponse}.json({ error: "Unauthorized" }, { status: 401 });
    }
    return ${NextResponse}.next();
  }

  if (isProtectedPage(pathname)) {
    if (!session) {
      const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set("next", pathname);
      return ${NextResponse}.redirect(loginUrl);
    }
    return ${NextResponse}.next();
  }

  return ${NextResponse}.next();
}

// Next.js requires this matcher array to be statically analyzable string literals — it can't
// reference the ACARAJE_BASE const above, so the project name is inlined directly here too.
export const config = {
  matcher: ["/login", "/${projectName}/:path*", "/api/:path*"],
}
`;

export default writeMiddleware;
