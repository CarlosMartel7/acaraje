import fs from "fs";
import os from "os";
import path from "path";

import { writeLog } from "./logger";

const PRISMA_SCHEMA_FIXTURE = path.join(__dirname, "sampleDBs", "schema.prisma");
const SQLITE_SCHEMA_FIXTURE = path.join(__dirname, "sampleDBs", "schema.sqlite.sql");

jest.mock("child_process", () => ({ execSync: jest.fn() }));

/**
 * init is meant to be run inside a project that already has a /prisma (or /database, for
 * pure-sql) directory holding the user's real schema — not a bare temp dir. Seed the scratch
 * outDir with that same layout before each run, so the folder actually shows up in the generated
 * output alongside everything init.ts produces.
 */
function seedPrismaSchema(outDir: string, fixture: string): string {
  const dir = path.join(outDir, "prisma");
  fs.mkdirSync(dir, { recursive: true });
  const schemaPath = path.join(dir, "schema.prisma");
  fs.copyFileSync(fixture, schemaPath);
  return schemaPath;
}

function seedSqlSchema(outDir: string, fixture: string): string {
  const dir = path.join(outDir, "database");
  fs.mkdirSync(dir, { recursive: true });
  const schemaPath = path.join(dir, "schema.sql");
  fs.copyFileSync(fixture, schemaPath);
  return schemaPath;
}

/**
 * `init.ts` calls every generate-*.ts step with no baseDir, so they all fall back to
 * process.cwd() — the only way to control where a real run lands is to chdir into a scratch
 * directory before invoking it. `prompts` (the p.group(...) call) is also created once at module
 * load time, so each scenario needs a fully fresh module instance via resetModules()+require().
 */
async function runInit(answers: Record<string, unknown>, outDir: string) {
  jest.resetModules();
  jest.doMock("@clack/prompts", () => ({
    group: jest.fn(() => Promise.resolve(answers)),
    intro: jest.fn(),
    outro: jest.fn(),
    cancel: jest.fn(),
  }));

  const { execSync } = require("child_process") as { execSync: jest.Mock };
  execSync.mockClear();

  const originalCwd = process.cwd();
  process.chdir(outDir);
  try {
    const initModule = require("../src/commands/init");
    await initModule.default();
  } finally {
    process.chdir(originalCwd);
  }

  return execSync;
}

function exists(outDir: string, ...segments: string[]) {
  return fs.existsSync(path.join(outDir, ...segments));
}

describe("prisma + docker", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-prisma-"));
  let execSync: jest.Mock;

  beforeAll(async () => {
    const schemaPath = seedPrismaSchema(outDir, PRISMA_SCHEMA_FIXTURE);

    execSync = await runInit(
      {
        name: "Acaraje",
        orm: "prisma",
        prov: undefined,
        schemaPath,
        storage: "minio",
        docker: true,
        username: "admin",
        password: "password",
      },
      outDir,
    );

    writeLog("init-prisma-docker", { outDir, files: fs.readdirSync(outDir) }, { output: outDir });
  });

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test("leaves the pre-existing /prisma directory (with the user's schema) in place", () => {
    expect(exists(outDir, "prisma", "schema.prisma")).toBe(true);
  });

  test("creates the folder scaffold and generates CRUD routes from the parsed schema", () => {
    expect(exists(outDir, "app")).toBe(true);
    expect(exists(outDir, "app", "api", "crud", "User", "route.ts")).toBe(true);
  });

  test("generates storage, seeder, auth, and rest-of-api output", () => {
    expect(exists(outDir, "lib", "storage", "index.ts")).toBe(true);
    expect(exists(outDir, "lib", "seeder", "config.ts")).toBe(true);
    expect(exists(outDir, "lib", "auth", "index.ts")).toBe(true);
    expect(exists(outDir, "app", "api", "schemas", "route.ts")).toBe(true);
  });

  test("generates components and front-end pages under the sanitized project name", () => {
    expect(exists(outDir, "components", "ui", "button.tsx")).toBe(true);
    expect(exists(outDir, "app", "page.tsx")).toBe(true);
    expect(exists(outDir, "app", "acaraje", "dashboard", "page.tsx")).toBe(true);
  });

  test("generates config files, including docker-compose.yml since docker was true", () => {
    expect(exists(outDir, "package.json")).toBe(true);
    expect(exists(outDir, "docker-compose.yml")).toBe(true);
    const compose = fs.readFileSync(path.join(outDir, "docker-compose.yml"), "utf-8");
    // schema.prisma's datasource provider is postgresql, and storage was "minio".
    expect(compose).toContain("  postgres:");
    expect(compose).toContain("  minio:");
  });

  test("runs npm install and, since orm is prisma, prisma generate", () => {
    expect(execSync).toHaveBeenCalledWith("npm install", expect.objectContaining({ cwd: outDir }));
    expect(execSync).toHaveBeenCalledWith("npx prisma generate", expect.objectContaining({ cwd: outDir }));
  });
});

describe("pure-sql + no docker", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-sql-"));
  let execSync: jest.Mock;

  beforeAll(async () => {
    const schemaPath = seedSqlSchema(outDir, SQLITE_SCHEMA_FIXTURE);

    execSync = await runInit(
      {
        name: "My Cool Panel!",
        orm: "pure-sql",
        prov: "sqlite",
        schemaPath,
        storage: "gcs",
        docker: false,
        username: "admin",
        password: "password",
      },
      outDir,
    );

    writeLog("init-pure-sql-no-docker", { outDir, files: fs.readdirSync(outDir) }, { output: outDir });
  });

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test("leaves the pre-existing /database directory (with the user's schema) in place", () => {
    expect(exists(outDir, "database", "schema.sql")).toBe(true);
  });

  test("generates Kysely-flavored CRUD routes under the sanitized project name", () => {
    expect(exists(outDir, "app", "api", "crud", "User", "route.ts")).toBe(true);
    const route = fs.readFileSync(path.join(outDir, "app", "api", "crud", "User", "route.ts"), "utf-8");
    expect(route).toContain('db.selectFrom("User")');
    expect(exists(outDir, "app", "my-cool-panel", "dashboard", "page.tsx")).toBe(true);
  });

  test("generates config files, but no docker-compose.yml since docker was false", () => {
    expect(exists(outDir, "package.json")).toBe(true);
    expect(exists(outDir, "docker-compose.yml")).toBe(false);
  });

  test("runs npm install but not prisma generate, since orm is pure-sql", () => {
    expect(execSync).toHaveBeenCalledWith("npm install", expect.objectContaining({ cwd: outDir }));
    expect(execSync).not.toHaveBeenCalledWith("npx prisma generate", expect.anything());
  });
});

test("resolveDbProvider rejects a schema.prisma datasource provider this CLI doesn't support", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-badprovider-"));
  const schemaPath = seedPrismaSchema(outDir, PRISMA_SCHEMA_FIXTURE);
  fs.writeFileSync(
    schemaPath,
    fs.readFileSync(schemaPath, "utf-8").replace('provider = "postgresql"', 'provider = "mongodb"'),
  );

  try {
    await expect(
      runInit(
        {
          name: "Acaraje",
          orm: "prisma",
          prov: undefined,
          schemaPath,
          storage: "minio",
          docker: true,
          username: "admin",
          password: "password",
        },
        outDir,
      ),
    ).rejects.toThrow(/Unsupported datasource provider "mongodb"/);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
