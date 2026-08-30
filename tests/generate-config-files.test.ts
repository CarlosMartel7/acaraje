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
generateConfigFiles("postgresql", "minio", true, "customadmin", "s3cr3t", dockerOutDir);
const dockerFiles = readAll(dockerOutDir);
const dockerCompose = fs.readFileSync(filePath(dockerOutDir, "docker-compose.yml"), "utf-8");
const dockerEnv = fs.readFileSync(filePath(dockerOutDir, ".env"), "utf-8");

const noDockerOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-config-files-nodocker-"));
generateConfigFiles("sqlite", "gcs", false, "admin", "password", noDockerOutDir);

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
    generateConfigFiles("postgresql", "minio", true, "customadmin", "s3cr3t", outDirB);
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
        generateConfigFiles(dbProvider, storage, true, "admin", "password", outDir);
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
  expect(() => generateConfigFiles("postgresql", "minio", true, "customadmin", "s3cr3t", dockerOutDir)).not.toThrow();
  const after = fs.readFileSync(filePath(dockerOutDir, "middleware.ts"), "utf-8");
  expect(after).toBe(before);
});
