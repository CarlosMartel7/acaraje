import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/acaraje/auth/login/route";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";
import { applyAuthEnv, AUTH_ENV, clearAuthEnv, loginRequest } from "./helpers";

describe("POST /api/acaraje/auth/login", () => {
  beforeEach(() => {
    applyAuthEnv();
  });

  afterEach(() => {
    clearAuthEnv();
  });

  it("returns 503 when auth env is missing", async () => {
    clearAuthEnv();
    const res = await POST(new NextRequest(loginRequest({ username: "admin", password: "x" })));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/not configured/i);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new NextRequest(
        new Request("http://localhost/api/acaraje/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{not-json",
        }),
      ),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when username or password is missing", async () => {
    const missingPassword = await POST(
      new NextRequest(loginRequest({ username: "admin", password: "" })),
    );
    expect(missingPassword.status).toBe(400);

    const missingUsername = await POST(
      new NextRequest(loginRequest({ username: "  ", password: "x" })),
    );
    expect(missingUsername.status).toBe(400);
  });

  it("returns 401 for wrong credentials", async () => {
    const res = await POST(
      new NextRequest(loginRequest({ username: "admin", password: "wrong" })),
    );
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Invalid username or password" });
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("returns 401 for wrong username", async () => {
    const res = await POST(
      new NextRequest(
        loginRequest({
          username: "not-admin",
          password: AUTH_ENV.ACARAJE_ADMIN_PASSWORD,
        }),
      ),
    );
    expect(res.status).toBe(401);
  });

  it("sets a signed session cookie on success", async () => {
    const res = await POST(
      new NextRequest(
        loginRequest({
          username: AUTH_ENV.ACARAJE_ADMIN_USERNAME,
          password: AUTH_ENV.ACARAJE_ADMIN_PASSWORD,
        }),
      ),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      username: AUTH_ENV.ACARAJE_ADMIN_USERNAME,
    });

    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/");

    const session = await verifySessionToken(cookie!.value, AUTH_ENV.ACARAJE_AUTH_SECRET);
    expect(session).toMatchObject({ username: AUTH_ENV.ACARAJE_ADMIN_USERNAME });
    expect(session!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("trims username before verifying", async () => {
    const res = await POST(
      new NextRequest(
        loginRequest({
          username: `  ${AUTH_ENV.ACARAJE_ADMIN_USERNAME}  `,
          password: AUTH_ENV.ACARAJE_ADMIN_PASSWORD,
        }),
      ),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      username: AUTH_ENV.ACARAJE_ADMIN_USERNAME,
    });
  });
});
