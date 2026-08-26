import fs from "fs";
import os from "os";
import path from "path";

import { generateAuth } from "../src/steps/generate-auth";
import { writeLog } from "./logger";

const LIB_FILES = ["config.ts", "credentials.ts", "index.ts", "require-auth.ts", "session.ts", "session-token.ts"];
const ROUTES = ["login", "logout", "session"];

function libPath(outDir: string, file: string) {
  return path.join(outDir, "lib", "auth", file);
}

function routePath(outDir: string, route: string) {
  return path.join(outDir, "app", "api", "auth", route, "route.ts");
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-auth-"));
generateAuth(outDir);

const lib = Object.fromEntries(
  LIB_FILES.map((file) => [file, fs.readFileSync(libPath(outDir, file), "utf-8")]),
) as Record<string, string>;

const api = Object.fromEntries(
  ROUTES.map((route) => [route, fs.readFileSync(routePath(outDir, route), "utf-8")]),
) as Record<string, string>;

writeLog("generate-auth", { outDir, lib, api }, { output: outDir });

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("writes every lib/auth file and app/api/auth route", () => {
  for (const file of LIB_FILES) {
    expect(fs.existsSync(libPath(outDir, file))).toBe(true);
  }
  for (const route of ROUTES) {
    expect(fs.existsSync(routePath(outDir, route))).toBe(true);
  }
});

test("lib/auth cross-references resolve to @/lib/auth/*, not the bare unqualified module names", () => {
  expect(lib["session.ts"]).toContain('from "@/lib/auth/session-token"');
  expect(lib["require-auth.ts"]).toContain('from "@/lib/auth/session-token"');
  expect(lib["credentials.ts"]).toContain('from "@/lib/auth/config"');
  expect(lib["session-token.ts"]).toContain('from "@/lib/auth/config"');

  for (const content of Object.values(lib)) {
    expect(content).not.toMatch(/from "@\/(config|session-token)"/);
  }
});

test("lib/auth/index.ts re-exports the full public surface", () => {
  const index = lib["index.ts"];
  expect(index).toContain("getAuthSecret");
  expect(index).toContain("verifyAdminCredentials");
  expect(index).toContain("createSessionToken");
  expect(index).toContain("getSession");
  expect(index).toContain("requireAuth");
});

test("api/auth routes import from the lib/auth barrel", () => {
  for (const content of Object.values(api)) {
    expect(content).toMatch(/from "@\/lib\/auth"/);
  }
});

test("login and logout routes expose POST; session route exposes GET", () => {
  expect(api.login).toContain("export async function POST(");
  expect(api.logout).toContain("export async function POST(");
  expect(api.session).toContain("export async function GET(");
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const content of [...Object.values(lib), ...Object.values(api)]) {
    expect(content).not.toContain("[object Object]");
  }
});

test("dprint successfully formats every generated file (double-quoted imports, not the raw single-quoted fallback)", () => {
  for (const content of [...Object.values(lib), ...Object.values(api)]) {
    expect(content).not.toMatch(/from '/);
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = lib["session.ts"];
  expect(() => generateAuth(outDir)).not.toThrow();
  const after = fs.readFileSync(libPath(outDir, "session.ts"), "utf-8");
  expect(after).toBe(before);
});
