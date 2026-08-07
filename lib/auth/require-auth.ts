import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "./session-token";

export class AuthError extends Error {
  status = 401 as const;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

/** Verify session cookie; throws AuthError if missing/invalid. */
export async function requireAuth(): Promise<SessionPayload> {
  const jar = await cookies();
  const session = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) throw new AuthError();
  return session;
}

/** For route handlers: return a 401 Response or the session. */
export async function requireAuthResponse(): Promise<
  { session: SessionPayload; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  try {
    const session = await requireAuth();
    return { session };
  } catch {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}
