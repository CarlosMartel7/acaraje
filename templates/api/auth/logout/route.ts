import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server");
const SESSION_COOKIE = imp("SESSION_COOKIE@@/lib/auth");
const sessionCookieOptions = imp("sessionCookieOptions@@/lib/auth");

const body = code`
export async function POST() {
  const response = ${NextResponse}.json({ ok: true });
  response.cookies.set(${SESSION_COOKIE}, "", {
    ...${sessionCookieOptions}(0),
    maxAge: 0,
  });
  return response;
}
`;

export default body;
