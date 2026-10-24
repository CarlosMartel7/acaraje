import fs from "fs";
import os from "os";
import path from "path";

import { generateCRUD } from "../src/steps/generate-crud";
import { generateQuery } from "../src/steps/generate-query";
import { generateComponents } from "../src/steps/generate-components";
import { generateStorage } from "../src/steps/generate-storage";
import { generateSeeder } from "../src/steps/generate-seeder";
import { generateRestOfApi } from "../src/steps/generate-rest-of-api";
import { generateConfigFiles } from "../src/steps/generate-config-files";
import { createFolderStructure } from "../src/steps/generate-folders";
import { prismaParser } from "../src/steps/prisma-parser";
import { sqlParser } from "../src/steps/sql-parser";
import { ACARAJE_CONFIG_FILE, readAcarajeConfig, writeAcarajeConfig } from "../src/shared/api-layer";
import { writeLog } from "./logger";

jest.mock("child_process", () => ({ execSync: jest.fn() }));
// src/shared/api-layer.ts imports @clack/prompts (ESM-only) for its prompt field; none of these
// tests render a prompt, so a stub is enough (update-schema's test re-mocks it with answers).
jest.mock("@clack/prompts", () => ({ select: jest.fn() }));

const PRISMA_SCHEMA_PATH = path.join(__dirname, "sampleDBs", "schema.prisma");
const SQLITE_SCHEMA_PATH = path.join(__dirname, "sampleDBs", "schema.sqlite.sql");
const schema = prismaParser(PRISMA_SCHEMA_PATH);
const modelNames = schema.models.map((m) => m.name).sort();

const tmpDirs: string[] = [];
function tmp(label: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `acaraje-trpc-${label}-`));
  tmpDirs.push(dir);
  return dir;
}
const read = (...segments: string[]) => fs.readFileSync(path.join(...segments), "utf-8");
const exists = (...segments: string[]) => fs.existsSync(path.join(...segments));

afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe("acaraje.config.json", () => {
  test("falls back to rest when the file is missing (projects generated before it existed)", () => {
    expect(readAcarajeConfig(tmp("config-missing"))).toEqual({ api: "rest" });
  });

  test("falls back to rest when the file is broken or holds an unknown api", () => {
    const broken = tmp("config-broken");
    fs.writeFileSync(path.join(broken, ACARAJE_CONFIG_FILE), "{not json");
    expect(readAcarajeConfig(broken)).toEqual({ api: "rest" });

    const unknown = tmp("config-unknown");
    fs.writeFileSync(path.join(unknown, ACARAJE_CONFIG_FILE), JSON.stringify({ api: "graphql" }));
    expect(readAcarajeConfig(unknown)).toEqual({ api: "rest" });
  });

  test("round-trips what writeAcarajeConfig wrote", () => {
    const dir = tmp("config-roundtrip");
    writeAcarajeConfig({ api: "trpc" }, dir);
    expect(readAcarajeConfig(dir)).toEqual({ api: "trpc" });
  });
});

describe("generateCRUD (trpc, prisma)", () => {
  const outDir = tmp("crud-prisma");
  generateCRUD(schema, "prisma", "trpc", outDir);
  const crudDir = path.join(outDir, "server", "trpc", "routers", "crud");
  const index = read(crudDir, "index.ts");
  writeLog("trpc-generate-crud", { outDir, index }, { output: outDir });

  test("writes one handlers file per model, plus the shared types and the crud router", () => {
    expect(fs.readdirSync(path.join(crudDir, "models")).sort()).toEqual(modelNames.map((n) => `${n}.ts`).sort());
    expect(exists(crudDir, "types.ts")).toBe(true);
  });

  test("the crud router imports and registers every model's handlers", () => {
    for (const name of modelNames) {
      expect(index).toContain(`import { handlers as ${name}Handlers } from "./models/${name}";`);
      expect(index).toContain(`"${name}": ${name}Handlers,`);
    }
    for (const procedure of ["list", "get", "options", "create", "update", "delete", "deleteMany", "deleteAll"]) {
      expect(index).toContain(`${procedure}: protectedProcedure`);
    }
  });

  test("writes no REST crud routes, but still writes the shared lib/crud helpers and prisma client", () => {
    expect(exists(outDir, "app", "api", "crud")).toBe(false);
    expect(exists(outDir, "lib", "crud", "resolve-filters.ts")).toBe(true);
    expect(exists(outDir, "lib", "prisma.ts")).toBe(true);
  });

  test("handlers use the model's lowerCamel prisma delegate and bake in its field metadata", () => {
    const user = read(crudDir, "models", "User.ts");
    expect(user).toContain("prisma.user.findMany(");
    expect(user).toContain('"email": { type: "String", isRelation: false, isList: false }');
    expect(user).toContain("export const handlers: CrudHandlers");
  });

  test("searches case-insensitively on postgresql", () => {
    expect(read(crudDir, "models", "User.ts")).toContain('mode: "insensitive"');
  });

  test("drops handlers for models removed from the schema when regenerated", () => {
    const fewer = { ...schema, models: schema.models.filter((m) => m.name !== "Review") };
    generateCRUD(fewer, "prisma", "trpc", outDir);
    expect(exists(crudDir, "models", "Review.ts")).toBe(false);
    expect(read(crudDir, "index.ts")).not.toContain("ReviewHandlers");
  });
});

describe("generateCRUD (trpc, pure-sql)", () => {
  test("uses Kysely, with ilike on postgresql", () => {
    const outDir = tmp("crud-sql-pg");
    const pgSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.postgresql.sql"), "PostgreSql");
    generateCRUD(pgSchema, "pure-sql", "trpc", outDir);
    const user = read(outDir, "server", "trpc", "routers", "crud", "models", "User.ts");
    expect(user).toContain('db.selectFrom("User" as any)');
    expect(user).toContain('"ilike"');
    expect(exists(outDir, "lib", "db.ts")).toBe(true);
  });

  test("falls back to like on sqlite", () => {
    const outDir = tmp("crud-sql-sqlite");
    const sqliteSchema = sqlParser(SQLITE_SCHEMA_PATH, "Sqlite");
    generateCRUD(sqliteSchema, "pure-sql", "trpc", outDir);
    const user = read(outDir, "server", "trpc", "routers", "crud", "models", "User.ts");
    expect(user).toContain('"like"');
    expect(user).not.toContain('"ilike"');
  });
});

describe("generateQuery", () => {
  test("trpc: writes the server/client plumbing and tRPC-backed hooks with the same file names", () => {
    const outDir = tmp("query-trpc");
    generateQuery("trpc", outDir);
    for (const file of ["server/trpc/init.ts", "server/trpc/root.ts", "app/api/trpc/[trpc]/route.ts", "lib/trpc/client.ts", "lib/query/client.ts"]) {
      expect(exists(outDir, file)).toBe(true);
    }
    // tRPC builds its own keys and fetchers, so the REST-only plumbing isn't written.
    expect(exists(outDir, "lib", "query", "api.ts")).toBe(false);
    expect(exists(outDir, "lib", "query", "keys.ts")).toBe(false);

    const crudHook = read(outDir, "query", "hooks", "use-crud.ts");
    expect(crudHook).toContain("useTRPC");
    for (const hook of ["useCrudList", "useCrudRecord", "useCrudOptions", "useCrudOptionsInfinite", "useCrudCreate", "useCrudUpdate", "useCrudDelete"]) {
      expect(crudHook).toContain(`export function ${hook}(`);
    }
    expect(read(outDir, "query", "hooks", "use-drive.ts")).toContain("export function useDriveUpload(");
    expect(read(outDir, "query", "hooks", "use-seed.ts")).toContain("export function useSaveSeederConfig(");
  });

  test("trpc: FormData goes through a non-batching link", () => {
    const outDir = tmp("query-trpc-links");
    generateQuery("trpc", outDir);
    const client = read(outDir, "lib", "trpc", "client.ts");
    expect(client).toContain("isNonJsonSerializable(op.input)");
    expect(client).toContain("true: httpLink(");
    expect(client).toContain("false: httpBatchLink(");
  });

  test("rest: writes no tRPC plumbing, and the REST hooks expose the same new hooks", () => {
    const outDir = tmp("query-rest");
    generateQuery("rest", outDir);
    expect(exists(outDir, "server")).toBe(false);
    expect(exists(outDir, "lib", "trpc")).toBe(false);
    expect(read(outDir, "query", "hooks", "use-drive.ts")).toContain("export function useDriveUpload(");
    expect(read(outDir, "query", "hooks", "use-seed.ts")).toContain("export function useSetSeederConfigCache(");
  });
});

describe("generateComponents", () => {
  test("trpc: QueryProvider also mounts TRPCProvider, under the same path and export name", () => {
    const outDir = tmp("components-trpc");
    generateComponents("Acaraje", "trpc", outDir);
    const provider = read(outDir, "components", "providers", "query-provider.tsx");
    expect(provider).toContain("export function QueryProvider(");
    expect(provider).toContain("<TRPCProvider");
  });

  test("rest: QueryProvider is the plain TanStack one", () => {
    const outDir = tmp("components-rest");
    generateComponents("Acaraje", "rest", outDir);
    expect(read(outDir, "components", "providers", "query-provider.tsx")).not.toContain("TRPCProvider");
  });
});

describe("generateStorage / generateSeeder / generateRestOfApi (trpc)", () => {
  test("storage writes one drive router (upload included) and no REST drive routes", () => {
    const outDir = tmp("storage-trpc");
    generateStorage("gcs", "trpc", outDir);
    const drive = read(outDir, "server", "trpc", "routers", "drive.ts");
    expect(drive).toContain("upload: protectedProcedure");
    expect(drive).toContain("z.instanceof(FormData)");
    expect(drive).toContain("getGcsStorage");
    expect(exists(outDir, "app", "api", "drive")).toBe(false);
    expect(exists(outDir, "lib", "storage", "index.ts")).toBe(true);
  });

  test("seeder writes one seed router and no REST seed routes, but keeps lib/seeder", () => {
    const outDir = tmp("seeder-trpc");
    generateSeeder(schema, "trpc", outDir);
    const seed = read(outDir, "server", "trpc", "routers", "seed.ts");
    for (const procedure of ["counts", "run", "config", "saveConfig"]) {
      expect(seed).toContain(`${procedure}: protectedProcedure`);
    }
    expect(exists(outDir, "app", "api", "seed")).toBe(false);
    expect(exists(outDir, "lib", "seeder", "config.ts")).toBe(true);
    expect(exists(outDir, "lib", "parsed-schema.ts")).toBe(true);
  });

  test("rest-of-api writes the schemas/relations/stats routers and no REST routes", () => {
    const outDir = tmp("rest-of-api-trpc");
    generateRestOfApi("trpc", outDir);
    for (const router of ["schemas", "relations", "stats"]) {
      expect(exists(outDir, "server", "trpc", "routers", `${router}.ts`)).toBe(true);
      expect(exists(outDir, "app", "api", router)).toBe(false);
    }
  });
});

describe("generateConfigFiles", () => {
  test("trpc adds the @trpc/* packages; rest doesn't", () => {
    const trpcDir = tmp("config-trpc");
    generateConfigFiles("Acaraje", "postgresql", "minio", false, "admin", "password", "trpc", trpcDir);
    const trpcDeps = JSON.parse(read(trpcDir, "package.json")).dependencies;
    expect(Object.keys(trpcDeps)).toEqual(expect.arrayContaining(["@trpc/server", "@trpc/client", "@trpc/tanstack-react-query"]));
    expect(trpcDeps["@tanstack/react-query"]).toBeDefined();

    const restDir = tmp("config-rest");
    generateConfigFiles("Acaraje", "postgresql", "minio", false, "admin", "password", "rest", restDir);
    expect(Object.keys(JSON.parse(read(restDir, "package.json")).dependencies).some((d) => d.startsWith("@trpc/"))).toBe(false);
  });
});

describe("createFolderStructure", () => {
  test("trpc skips the REST-only app/api folders but keeps auth", () => {
    const outDir = tmp("folders-trpc");
    createFolderStructure("Acaraje", schema, "trpc", outDir);
    expect(fs.readdirSync(path.join(outDir, "app", "api"))).toEqual(["auth"]);
    expect(exists(outDir, "app", "acaraje", "crud")).toBe(true);
  });
});

describe("acaraje update schema", () => {
  test("regenerates the flavor recorded in acaraje.config.json", async () => {
    const outDir = tmp("update-schema");
    fs.mkdirSync(path.join(outDir, "prisma"));
    fs.copyFileSync(PRISMA_SCHEMA_PATH, path.join(outDir, "prisma", "schema.prisma"));
    writeAcarajeConfig({ api: "trpc" }, outDir);

    jest.resetModules();
    jest.doMock("@clack/prompts", () => ({
      group: jest.fn(() => Promise.resolve({ name: "Acaraje", orm: "prisma", prov: undefined, schemaPath: "/prisma" })),
      intro: jest.fn(),
      outro: jest.fn(),
      cancel: jest.fn(),
    }));

    const originalCwd = process.cwd();
    process.chdir(outDir);
    try {
      await require("../src/commands/update-schema").default();
    } finally {
      process.chdir(originalCwd);
    }

    expect(exists(outDir, "server", "trpc", "routers", "crud", "models", "User.ts")).toBe(true);
    expect(exists(outDir, "server", "trpc", "routers", "seed.ts")).toBe(true);
    expect(exists(outDir, "app", "api", "crud")).toBe(false);
    expect(exists(outDir, "app", "api", "seed")).toBe(false);
  });
});
