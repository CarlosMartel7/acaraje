import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session-token";
import { applyAuthEnv, AUTH_ENV, clearAuthEnv } from "./helpers";

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
  })),
}));

describe("GET /api/acaraje/auth/session", () => {
  beforeEach(() => {
    applyAuthEnv();
    cookieStore.clear();
  });

  afterEach(() => {
    clearAuthEnv();
    cookieStore.clear();
  });

  it("returns 401 when there is no session cookie", async () => {
    const { GET } = await import("@/app/api/acaraje/auth/session/route");
    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ authenticated: false });
  });

  it("returns 401 for an invalid session cookie", async () => {
    cookieStore.set(SESSION_COOKIE, "not.a.valid.token");
    const { GET } = await import("@/app/api/acaraje/auth/session/route");
    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ authenticated: false });
  });

  it("returns authenticated session for a valid cookie", async () => {
    const token = await createSessionToken(
      AUTH_ENV.ACARAJE_ADMIN_USERNAME,
      AUTH_ENV.ACARAJE_AUTH_SECRET,
    );
    cookieStore.set(SESSION_COOKIE, token);

    const { GET } = await import("@/app/api/acaraje/auth/session/route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      authenticated: true,
      username: AUTH_ENV.ACARAJE_ADMIN_USERNAME,
    });
  });

  it("returns 401 for an expired session token", async () => {
    const token = await createSessionToken(
      AUTH_ENV.ACARAJE_ADMIN_USERNAME,
      AUTH_ENV.ACARAJE_AUTH_SECRET,
      -10,
    );
    cookieStore.set(SESSION_COOKIE, token);

    const { GET } = await import("@/app/api/acaraje/auth/session/route");
    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ authenticated: false });
  });
});
