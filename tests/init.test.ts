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
 * output alongside everything init.ts produces. Returns the real on-disk file path (for setup/
 * assertions), separate from the "/prisma"-style folder value the mocked prompt answer uses —
 * init.ts is responsible for joining that folder with cwd and the schema filename itself.
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
// The p.group mock from the most recent runInit(), so a test can inspect the prompt fields init
// passed in (e.g. that the API layer prompt is skipped when --api was given).
let lastGroupMock: jest.Mock;

async function runInit(answers: Record<string, unknown>, outDir: string, opts: Record<string, unknown> = {}) {
  jest.resetModules();
  lastGroupMock = jest.fn(() => Promise.resolve(answers));
  jest.doMock("@clack/prompts", () => ({
    group: lastGroupMock,
    select: jest.fn(() => "prompted"),
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
    await initModule.default(opts);
  } finally {
    process.chdir(originalCwd);
  }

  return execSync;
}

function exists(outDir: string, ...segments: string[]) {
  return fs.existsSync(path.join(outDir, ...segments));
}

function readJson(outDir: string, ...segments: string[]) {
  return JSON.parse(fs.readFileSync(path.join(outDir, ...segments), "utf-8"));
}

describe("prisma + docker", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-prisma-"));
  let execSync: jest.Mock;

  beforeAll(async () => {
    seedPrismaSchema(outDir, PRISMA_SCHEMA_FIXTURE);

    // "/prisma" is the real prompt's default answer — a project-relative folder, not a file
    // path. init.ts must join it with cwd + "schema.prisma" itself (this is a regression test
    // for exactly that: it used to pass schemaPath straight to prismaParser unjoined, which
    // crashed on every real run with ENOENT: no such file or directory, open '/prisma').
    execSync = await runInit(
      {
        name: "Acaraje",
        orm: "prisma",
        prov: undefined,
        schemaPath: "/prisma",
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

  test("runs prisma db push unconditionally, since orm is prisma", () => {
    expect(execSync).toHaveBeenCalledWith("npx prisma db push", expect.objectContaining({ cwd: outDir }));
  });

  test("defaults to the REST API layer when neither --api nor an api answer is given", () => {
    expect(readJson(outDir, "acaraje.config.json")).toEqual({ api: "rest" });
    expect(exists(outDir, "server", "trpc")).toBe(false);
    expect(exists(outDir, "app", "api", "trpc")).toBe(false);
    expect(readJson(outDir, "package.json").dependencies["@trpc/server"]).toBeUndefined();
  });
});

describe("prisma + trpc (via the --api flag)", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-prisma-trpc-"));

  beforeAll(async () => {
    seedPrismaSchema(outDir, PRISMA_SCHEMA_FIXTURE);
    await runInit(
      {
        name: "Acaraje",
        orm: "prisma",
        prov: undefined,
        schemaPath: "/prisma",
        storage: "minio",
        docker: true,
        username: "admin",
        password: "password",
      },
      outDir,
      { api: "trpc" },
    );

    writeLog("init-prisma-trpc", { outDir, files: fs.readdirSync(outDir) }, { output: outDir });
  });

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test("skips the API layer prompt, since --api already answered it", () => {
    // Third p.group() call (after the install-mode and schema-source prompts) is init's own
    // buildPrompts(); its api field returns undefined (= skip).
    const restOfPrompts = lastGroupMock.mock.calls[2][0] as Record<string, () => unknown>;
    expect(restOfPrompts.api()).toBeUndefined();
  });

  test("persists the choice to acaraje.config.json", () => {
    expect(readJson(outDir, "acaraje.config.json")).toEqual({ api: "trpc" });
  });

  test("writes the tRPC server, the single /api/trpc route, and per-model crud handlers", () => {
    expect(exists(outDir, "server", "trpc", "init.ts")).toBe(true);
    expect(exists(outDir, "server", "trpc", "root.ts")).toBe(true);
    expect(exists(outDir, "app", "api", "trpc", "[trpc]", "route.ts")).toBe(true);
    expect(exists(outDir, "lib", "trpc", "client.ts")).toBe(true);
    expect(exists(outDir, "server", "trpc", "routers", "crud", "models", "User.ts")).toBe(true);
    for (const router of ["schemas", "relations", "stats", "seed", "drive"]) {
      expect(exists(outDir, "server", "trpc", "routers", `${router}.ts`)).toBe(true);
    }
  });

  test("writes no REST data routes — only auth stays REST", () => {
    expect(fs.readdirSync(path.join(outDir, "app", "api")).sort()).toEqual(["auth", "trpc"]);
  });

  test("adds the tRPC packages to package.json", () => {
    const deps = readJson(outDir, "package.json").dependencies;
    expect(deps["@trpc/server"]).toBeDefined();
    expect(deps["@trpc/client"]).toBeDefined();
    expect(deps["@trpc/tanstack-react-query"]).toBeDefined();
  });
});

describe("pure-sql + trpc (via the prompt)", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-sql-trpc-"));

  beforeAll(async () => {
    seedSqlSchema(outDir, SQLITE_SCHEMA_FIXTURE);
    await runInit(
      {
        name: "Acaraje",
        orm: "pure-sql",
        prov: "sqlite",
        schemaPath: "/database",
        storage: "gcs",
        api: "trpc",
        docker: false,
        username: "admin",
        password: "password",
      },
      outDir,
    );
  });

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test("asks the API layer prompt when no --api flag was given", () => {
    const restOfPrompts = lastGroupMock.mock.calls[2][0] as Record<string, () => unknown>;
    expect(restOfPrompts.api()).toBe("prompted");
  });

  test("uses the prompted answer and generates Kysely-flavored crud handlers", () => {
    expect(readJson(outDir, "acaraje.config.json")).toEqual({ api: "trpc" });
    const handlers = fs.readFileSync(path.join(outDir, "server", "trpc", "routers", "crud", "models", "User.ts"), "utf-8");
    expect(handlers).toContain('db.selectFrom("User" as any)');
    expect(exists(outDir, "app", "api", "crud")).toBe(false);
  });
});

describe("pure-sql + no docker", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-sql-"));
  let execSync: jest.Mock;

  beforeAll(async () => {
    seedSqlSchema(outDir, SQLITE_SCHEMA_FIXTURE);

    // "/database" is the real prompt's default answer for pure-sql mode — see the equivalent
    // comment in the prisma scenario above for why this must stay unjoined here.
    execSync = await runInit(
      {
        name: "My Cool Panel!",
        orm: "pure-sql",
        prov: "sqlite",
        schemaPath: "/database",
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

  test("runs npm install but not prisma generate or db push, since orm is pure-sql", () => {
    expect(execSync).toHaveBeenCalledWith("npm install", expect.objectContaining({ cwd: outDir }));
    expect(execSync).not.toHaveBeenCalledWith("npx prisma generate", expect.anything());
    expect(execSync).not.toHaveBeenCalledWith("npx prisma db push", expect.anything());
  });
});

test("resolveDbProvider rejects a schema.prisma datasource provider this CLI doesn't support", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-init-badprovider-"));
  const schemaFilePath = seedPrismaSchema(outDir, PRISMA_SCHEMA_FIXTURE);
  fs.writeFileSync(
    schemaFilePath,
    fs.readFileSync(schemaFilePath, "utf-8").replace('provider = "postgresql"', 'provider = "mongodb"'),
  );

  try {
    await expect(
      runInit(
        {
          name: "Acaraje",
          orm: "prisma",
          prov: undefined,
          schemaPath: "/prisma",
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
