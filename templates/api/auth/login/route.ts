import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const createSessionToken = imp("createSessionToken@@/lib/auth");
const sessionCookieOptions = imp("sessionCookieOptions@@/lib/auth");
const SESSION_COOKIE = imp("SESSION_COOKIE@@/lib/auth");
const tryGetAuthSecret = imp("tryGetAuthSecret@@/lib/auth");
const tryGetAdminCredentials = imp("tryGetAdminCredentials@@/lib/auth");
const verifyAdminCredentials = imp("verifyAdminCredentials@@/lib/auth");

const body = code`
export async function POST(request: ${NextRequest}) {
  if (!${tryGetAuthSecret}() || !${tryGetAdminCredentials}()) {
    return ${NextResponse}.json(
      {
        error:
          "Admin auth is not configured. Set ACARAJE_ADMIN_USERNAME, ACARAJE_ADMIN_PASSWORD, and ACARAJE_AUTH_SECRET.",
      },
      { status: 503 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return ${NextResponse}.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return ${NextResponse}.json({ error: "Username and password are required" }, { status: 400 });
  }

  if (!${verifyAdminCredentials}(username, password)) {
    return ${NextResponse}.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = await ${createSessionToken}(username);
  const response = ${NextResponse}.json({ ok: true, username });
  response.cookies.set(${SESSION_COOKIE}, token, ${sessionCookieOptions}());
  return response;
}
`;

export default body;
