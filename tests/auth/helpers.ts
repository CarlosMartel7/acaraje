export const AUTH_ENV = {
  ACARAJE_ADMIN_USERNAME: "admin",
  ACARAJE_ADMIN_PASSWORD: "test-password",
  ACARAJE_AUTH_SECRET: "test-secret-at-least-16",
} as const;

export function applyAuthEnv(): void {
  process.env.ACARAJE_ADMIN_USERNAME = AUTH_ENV.ACARAJE_ADMIN_USERNAME;
  process.env.ACARAJE_ADMIN_PASSWORD = AUTH_ENV.ACARAJE_ADMIN_PASSWORD;
  process.env.ACARAJE_AUTH_SECRET = AUTH_ENV.ACARAJE_AUTH_SECRET;
}

export function clearAuthEnv(): void {
  delete process.env.ACARAJE_ADMIN_USERNAME;
  delete process.env.ACARAJE_ADMIN_PASSWORD;
  delete process.env.ACARAJE_AUTH_SECRET;
}

export function loginRequest(body: unknown): Request {
  return new Request("http://localhost/api/acaraje/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
