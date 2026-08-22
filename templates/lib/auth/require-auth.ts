import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server");
const cookies = imp("cookies@next/headers");
const SESSION_COOKIE = imp("SESSION_COOKIE@@/session-token");
const verifySessionToken = imp("verifySessionToken@@/session-token");
const SessionPayload = imp("SessionPayload@@/session-token");

const body = code`
export class AuthError extends Error {
  status = 401 as const;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

/** Verify session cookie; throws AuthError if missing/invalid. */
export async function requireAuth(): Promise<${SessionPayload}> {
  const jar = await ${cookies}();
  const session = await ${verifySessionToken}(jar.get(${SESSION_COOKIE})?.value);
  if (!session) throw new AuthError();
  return session;
}

/** For route handlers: return a 401 Response or the session. */
export async function requireAuthResponse(): Promise<
  { session: ${SessionPayload}; error?: undefined } | { session?: undefined; error: ${NextResponse} }
> {
  try {
    const session = await requireAuth();
    return { session };
  } catch {
    return {
      error: ${NextResponse}.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}
`;

export default body;
