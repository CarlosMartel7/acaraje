import fs from "fs";
import os from "os";
import path from "path";

import { generateConfigFiles } from "../src/steps/generate-config-files";
import type { DbProvider, StorageProvider } from "../templates/config/docker-compose.yml";
import { writeLog } from "./logger";

const STATIC_FILES = [
  ".env.example",
  "package.json",
  "tsconfig.json",
  "tailwind.config.js",
  "middleware.ts",
  "next.config.js",
  "postcss.config.js",
  "vitest.config.mts",
  "instrumentation.ts",
  "global.d.ts",
];

function filePath(outDir: string, name: string) {
  return path.join(outDir, name);
}

function readAll(outDir: string) {
  return Object.fromEntries(
    STATIC_FILES.map((name) => [name, fs.readFileSync(filePath(outDir, name), "utf-8")]),
  ) as Record<string, string>;
}

const dockerOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-config-files-docker-"));
generateConfigFiles("Acaraje", "postgresql", "minio", true, "customadmin", "s3cr3t", dockerOutDir);
const dockerFiles = readAll(dockerOutDir);
const dockerCompose = fs.readFileSync(filePath(dockerOutDir, "docker-compose.yml"), "utf-8");
const dockerEnv = fs.readFileSync(filePath(dockerOutDir, ".env"), "utf-8");

const noDockerOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-config-files-nodocker-"));
generateConfigFiles("Acaraje", "sqlite", "gcs", false, "admin", "password", noDockerOutDir);

writeLog(
  "generate-config-files",
  { dockerOutDir, dockerFiles, dockerCompose, dockerEnv, noDockerOutDir },
  { docker: dockerOutDir, "no-docker": noDockerOutDir },
);

afterAll(() => {
  fs.rmSync(dockerOutDir, { recursive: true, force: true });
  fs.rmSync(noDockerOutDir, { recursive: true, force: true });
});

test("writes every static config file regardless of the docker flag", () => {
  for (const name of STATIC_FILES) {
    expect(fs.existsSync(filePath(dockerOutDir, name))).toBe(true);
    expect(fs.existsSync(filePath(noDockerOutDir, name))).toBe(true);
  }
});

test("writes a real .env with the chosen credentials and a generated auth secret", () => {
  const env = fs.readFileSync(filePath(dockerOutDir, ".env"), "utf-8");
  expect(env).toContain("ACARAJE_ADMIN_USERNAME=customadmin");
  expect(env).toContain("ACARAJE_ADMIN_PASSWORD=s3cr3t");
  expect(env).toMatch(/ACARAJE_AUTH_SECRET=\S+/);
  expect(env).toContain("DATABASE_PROVIDER=postgresql");
  expect(env).toContain('DATABASE_URL="postgresql://postgres:password@localhost:5433/acaraje_dev?schema=public"');
  expect(env).toContain("MINIO_ACCESS_KEY=minioadmin");
  expect(env).not.toContain("GCS_");

  const sqliteEnv = fs.readFileSync(filePath(noDockerOutDir, ".env"), "utf-8");
  expect(sqliteEnv).toContain("ACARAJE_ADMIN_USERNAME=admin");
  expect(sqliteEnv).toContain("ACARAJE_ADMIN_PASSWORD=password");
  expect(sqliteEnv).toContain("DATABASE_PROVIDER=sqlite");
  expect(sqliteEnv).toContain('DATABASE_URL="file:./dev.db"');
  expect(sqliteEnv).toContain("GCS_PROJECT_ID=acaraje-dev");
  expect(sqliteEnv).not.toContain("MINIO_");
});

test("each generation gets its own auth secret — never reused across runs", () => {
  const envA = fs.readFileSync(filePath(dockerOutDir, ".env"), "utf-8");
  const outDirB = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-config-files-secret-"));
  try {
    generateConfigFiles("Acaraje", "postgresql", "minio", true, "customadmin", "s3cr3t", outDirB);
    const envB = fs.readFileSync(filePath(outDirB, ".env"), "utf-8");
    const secretOf = (env: string) => env.match(/ACARAJE_AUTH_SECRET=(\S+)/)?.[1];
    expect(secretOf(envA)).toBeTruthy();
    expect(secretOf(envA)).not.toBe(secretOf(envB));
  } finally {
    fs.rmSync(outDirB, { recursive: true, force: true });
  }
});

test("only writes docker-compose.yml when docker is true", () => {
  expect(fs.existsSync(filePath(dockerOutDir, "docker-compose.yml"))).toBe(true);
  expect(fs.existsSync(filePath(noDockerOutDir, "docker-compose.yml"))).toBe(false);
});

test("writes real rendered content, not a write function's own JS source", () => {
  // Same regression class as generate-components.ts/generate-front-end.ts once had: storing the
  // write *functions* and calling .toString() on them directly instead of invoking them first
  // silently writes out each function's own bundled source instead of its rendered output.
  for (const content of [...Object.values(dockerFiles), dockerCompose, dockerEnv]) {
    expect(content).not.toContain("import_ts_poet");
    expect(content).not.toMatch(/^\(\)\s*=>/);
  }
});

test("package.json and tsconfig.json are valid, parseable JSON", () => {
  expect(() => JSON.parse(dockerFiles["package.json"])).not.toThrow();
  expect(() => JSON.parse(dockerFiles["tsconfig.json"])).not.toThrow();
  expect(JSON.parse(dockerFiles["package.json"]).name).toBe("acaraje-admin");
  expect(JSON.parse(dockerFiles["tsconfig.json"]).compilerOptions.jsx).toBe("preserve");
});

test("package.json depends on kysely plus exactly the driver matching the chosen database provider", () => {
  const pg = JSON.parse(dockerFiles["package.json"]); // dockerOutDir was generated with "postgresql"
  expect(pg.dependencies.kysely).toBeTruthy();
  expect(pg.dependencies.pg).toBeTruthy();
  expect(pg.devDependencies["@types/pg"]).toBeTruthy();
  expect(pg.dependencies.mysql2).toBeUndefined();
  expect(pg.dependencies["better-sqlite3"]).toBeUndefined();

  const sqlite = JSON.parse(fs.readFileSync(filePath(noDockerOutDir, "package.json"), "utf-8")); // "sqlite"
  expect(sqlite.dependencies.kysely).toBeTruthy();
  expect(sqlite.dependencies["better-sqlite3"]).toBeTruthy();
  expect(sqlite.devDependencies["@types/better-sqlite3"]).toBeTruthy();
  expect(sqlite.dependencies.pg).toBeUndefined();
  expect(sqlite.dependencies.mysql2).toBeUndefined();

  const mysqlOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-config-files-mysql-"));
  try {
    generateConfigFiles("Acaraje", "mysql", "minio", false, "admin", "password", mysqlOutDir);
    const mysql = JSON.parse(fs.readFileSync(filePath(mysqlOutDir, "package.json"), "utf-8"));
    expect(mysql.dependencies.kysely).toBeTruthy();
    expect(mysql.dependencies.mysql2).toBeTruthy();
    expect(mysql.dependencies.pg).toBeUndefined();
    expect(mysql.dependencies["better-sqlite3"]).toBeUndefined();
  } finally {
    fs.rmSync(mysqlOutDir, { recursive: true, force: true });
  }
});

test("postcss.config.js references tailwindcss/autoprefixer, not next.config.js's content", () => {
  // Regression pin: the original source file was byte-for-byte identical to next.config.js.
  expect(dockerFiles["postcss.config.js"]).toContain("tailwindcss");
  expect(dockerFiles["postcss.config.js"]).toContain("autoprefixer");
  expect(dockerFiles["postcss.config.js"]).not.toContain("ignoreBuildErrors");
});

test("middleware.ts guards /api/* and /acaraje/* — not the mismatched /api/acaraje/* paths", () => {
  // Regression pin: the original source checked /api/acaraje/* paths that no generate-*.ts step
  // actually writes routes under, so auth protection would never have matched anything.
  const mw = dockerFiles["middleware.ts"];
  expect(mw).toContain('"/api/auth/login"');
  expect(mw).toContain('startsWith("/api/")');
  expect(mw).toContain('"/api/:path*"');
  expect(mw).not.toContain("/api/acaraje");
});

test("middleware.ts's protected-route base matches the sanitized panel name, not a hardcoded 'acaraje'", () => {
  // Regression pin: the base path (isProtectedPage, the login redirect target, and the matcher)
  // used to be hardcoded to "/acaraje" regardless of the panel name, so a custom name broke auth
  // protection for every page (they'd never match "/acaraje/..." at all).
  const mw = dockerFiles["middleware.ts"]; // dockerOutDir was generated with name "Acaraje"
  expect(mw).toContain('const ACARAJE_BASE = "/acaraje"');
  expect(mw).toContain('"/acaraje/:path*"');

  const customOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-config-files-custom-name-"));
  try {
    generateConfigFiles("My Cool Panel!", "postgresql", "minio", false, "admin", "password", customOutDir);
    const customMw = fs.readFileSync(filePath(customOutDir, "middleware.ts"), "utf-8");
    expect(customMw).toContain('const ACARAJE_BASE = "/my-cool-panel"');
    expect(customMw).toContain('"/my-cool-panel/:path*"');
    expect(customMw).not.toContain("/acaraje");
  } finally {
    fs.rmSync(customOutDir, { recursive: true, force: true });
  }
});

test("instrumentation.ts calls ensureBucketReady, matching the lib/storage barrel's real export", () => {
  // Regression pin: the original source destructured "ensureStorageBucketReady", a name the
  // storage barrel (templates/lib/storage/index.ts) never actually exports.
  const inst = dockerFiles["instrumentation.ts"];
  expect(inst).toContain("ensureBucketReady");
  expect(inst).not.toContain("ensureStorageBucketReady");
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const content of [...Object.values(dockerFiles), dockerCompose, dockerEnv]) {
    expect(content).not.toContain("[object Object]");
  }
});

test("dprint successfully formats the real TS/JS config files (double-quoted imports, not the raw single-quoted fallback)", () => {
  for (const name of ["middleware.ts", "vitest.config.mts", "global.d.ts", "next.config.js", "instrumentation.ts"]) {
    expect(dockerFiles[name]).not.toMatch(/from '/);
  }
});

describe("docker-compose.yml is built from parts based on the chosen database and storage", () => {
  const combos: Array<[DbProvider, StorageProvider]> = [
    ["postgresql", "minio"],
    ["postgresql", "gcs"],
    ["mysql", "minio"],
    ["mysql", "gcs"],
    ["sqlite", "minio"],
    ["sqlite", "gcs"],
  ];

  for (const [dbProvider, storage] of combos) {
    test(`db=${dbProvider} storage=${storage}`, () => {
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `acaraje-docker-compose-${dbProvider}-${storage}-`));
      try {
        generateConfigFiles("Acaraje", dbProvider, storage, true, "admin", "password", outDir);
        const compose = fs.readFileSync(filePath(outDir, "docker-compose.yml"), "utf-8");

        // Only the chosen database gets a service — sqlite is file-based and gets none.
        expect(compose.includes("  postgres:")).toBe(dbProvider === "postgresql");
        expect(compose.includes("  mysql:")).toBe(dbProvider === "mysql");

        // Only the chosen storage backend's service is included, never both.
        expect(compose.includes("  minio:")).toBe(storage === "minio");
        expect(compose.includes("fake-gcs-server:")).toBe(storage === "gcs");

        // The volumes block only lists volumes for services actually present.
        expect(compose.includes("postgres_data:")).toBe(dbProvider === "postgresql");
        expect(compose.includes("mysql_data:")).toBe(dbProvider === "mysql");
        expect(compose.includes("minio_data:")).toBe(storage === "minio");
        expect(compose.includes("gcs_data:")).toBe(storage === "gcs");

        expect(compose).not.toContain("mongo");
      } finally {
        fs.rmSync(outDir, { recursive: true, force: true });
      }
    });
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = dockerFiles["middleware.ts"];
  expect(() => generateConfigFiles("Acaraje", "postgresql", "minio", true, "customadmin", "s3cr3t", dockerOutDir)).not.toThrow();
  const after = fs.readFileSync(filePath(dockerOutDir, "middleware.ts"), "utf-8");
  expect(after).toBe(before);
});
