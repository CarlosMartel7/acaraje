import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/acaraje/auth/logout/route";
import { SESSION_COOKIE } from "@/lib/auth/session-token";

describe("POST /api/acaraje/auth/logout", () => {
  it("clears the session cookie", async () => {
    const res = await POST();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie!.value).toBe("");
    expect(cookie!.maxAge).toBe(0);
  });
});
