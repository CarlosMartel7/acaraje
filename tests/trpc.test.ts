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
import { loadGeneratedModule, trpcInitStub, TRPCErrorStub } from "./helpers/generated-module";
import { createSqliteKysely } from "./helpers/sqlite-kysely";
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

  test("handlers use the model's lowerCamel prisma delegate and the shared filter schema", () => {
    const user = read(crudDir, "models", "User.ts");
    expect(user).toContain("prisma.user.findMany(");
    expect(user).toContain('const MODEL = "User";');
    expect(user).toContain('import { filterSchema } from "@/lib/crud/filter-schema";');
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
    // The handlers' filter metadata is rebuilt from the regenerated parsed schema.
    expect(exists(outDir, "lib", "parsed-schema.ts")).toBe(true);
    expect(exists(outDir, "lib", "crud", "filter-schema.ts")).toBe(true);
  });
});

describe("filter engine wiring (tRPC)", () => {
  const group = (combinator: "and" | "or", children: unknown[], not = false) => ({ type: "group", combinator, not, children });
  const condition = (field: string, operator: string, value: string) => ({ field, operator, value });
  const relation = (name: string, mode: string, where?: unknown) => ({ type: "relation", relation: name, mode, ...(where ? { where } : {}) });

  /** "@/server/trpc/init" whose procedures keep their input schema, so the router's contract can be run. */
  const procedureRecorder = {
    router: (procedures: unknown) => procedures,
    protectedProcedure: {
      input: (schema: any) => ({
        query: (handler: unknown) => ({ schema, handler }),
        mutation: (handler: unknown) => ({ schema, handler }),
      }),
    },
  };

  test("the crud router's list input accepts filter trees and pre-group arrays, and rejects malformed ones", () => {
    const outDir = tmp("filter-router");
    generateCRUD(schema, "prisma", "trpc", outDir);
    const { crudRouter } = loadGeneratedModule(outDir, "server/trpc/routers/crud/index.ts", {
      "@/server/trpc/init": { ...trpcInitStub, ...procedureRecorder },
      "@trpc/server": { TRPCError: TRPCErrorStub },
      "@/lib/prisma": { prisma: {} },
      "@/lib/parsed-schema": { parsedSchema: schema },
    });
    const accepts = (filters: unknown) => crudRouter.list.schema.safeParse({ model: "User", filters }).success;

    expect(accepts(group("and", [condition("name", "contains", "a"), group("or", [], true), relation("products", "none")]))).toBe(true);
    expect(accepts(group("and", [relation("products", "every", group("and", [relation("reviews", "some")]))]))).toBe(true);
    expect(accepts([condition("name", "equals", "ann")])).toBe(true);
    expect(accepts(undefined)).toBe(true);

    expect(accepts(group("xor" as any, []))).toBe(false);
    expect(accepts(group("and", [relation("products", "most")]))).toBe(false);
    expect(accepts(group("and", [condition("name", "like", "a")]))).toBe(false);
    expect(accepts(group("and", [{ field: "name", operator: "equals", value: 1 }]))).toBe(false);
  });

  test("list handlers resolve through the shared rules in both ORM flavors", () => {
    const prismaDir = tmp("filter-handlers-prisma");
    generateCRUD(schema, "prisma", "trpc", prismaDir);
    const sqlDir = tmp("filter-handlers-sql");
    generateCRUD(sqlParser(SQLITE_SCHEMA_PATH, "Sqlite"), "pure-sql", "trpc", sqlDir);

    const prismaUser = read(prismaDir, "server", "trpc", "routers", "crud", "models", "User.ts");
    const sqlUser = read(sqlDir, "server", "trpc", "routers", "crud", "models", "User.ts");
    for (const handlers of [prismaUser, sqlUser]) {
      expect(handlers).toContain("resolveListQuery({ filters, sortField, sortOrder }, filterSchema, MODEL)");
      expect(handlers).toContain('code: "BAD_REQUEST", message: query.error');
      expect(handlers).not.toContain("getFieldKind");
    }
    expect(prismaUser).toContain("buildPrismaListArgs(");
    expect(sqlUser).toContain("buildKyselyWhere(");
    expect(sqlUser).toContain('dialect: "sqlite"');
    expect(read(prismaDir, "server", "trpc", "routers", "crud", "types.ts")).toContain("filters?: Crud.FilterInput;");
  });

  test("a pure-sql list handler answers relation filters with the right rows", async () => {
    const sqliteSchema = sqlParser(SQLITE_SCHEMA_PATH, "Sqlite");
    const outDir = tmp("filter-rows");
    generateCRUD(sqliteSchema, "pure-sql", "trpc", outDir);
    const { db, close } = createSqliteKysely(
      read(SQLITE_SCHEMA_PATH) +
        `
INSERT INTO "User" ("email", "name", "role") VALUES ('ann@x.io', 'ann', 'SELLER'), ('bob@x.io', 'bob', 'SELLER'), ('cid@x.io', 'cid', 'BUYER');
INSERT INTO "Category" ("name") VALUES ('home');
INSERT INTO "Product" ("name", "price", "stock", "status", "sellerId", "categoryId") VALUES
  ('lamp', 30, 1, 'PUBLISHED', 1, 1), ('rake', 20, 0, 'DRAFT', 2, 1);
INSERT INTO "Review" ("productId", "authorId", "rating") VALUES (1, 3, 5);
`,
    );
    try {
      const handlers = loadGeneratedModule(outDir, "server/trpc/routers/crud/models/User.ts", {
        "@/lib/db": { db },
        "@/lib/parsed-schema": { parsedSchema: sqliteSchema },
        "@/server/trpc/init": trpcInitStub,
        "@trpc/server": { TRPCError: TRPCErrorStub },
      }).handlers;
      const ids = async (filters: unknown) =>
        (await handlers.list({ page: 1, pageSize: 20, search: "", filters, sortField: "id", sortOrder: "asc" })).records.map((r: any) => r.id);

      // Sellers whose products were all reviewed 5 stars: bob's rake has no review.
      const everyProductReviewed = relation(
        "Product.sellerId",
        "every",
        group("and", [relation("Review.productId", "some", group("and", [condition("rating", "gte", "5")]))]),
      );
      expect(await ids(group("and", [everyProductReviewed, relation("Product.sellerId", "some")]))).toEqual([1]);
      // Authors of a review, through the other foreign key on Review.
      expect(await ids(group("and", [relation("Review.authorId", "some")]))).toEqual([3]);
      await expect(ids(group("and", [relation("Product.sellerId", "some", group("and", [condition("email", "equals", "x")]))]))).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    } finally {
      close();
    }
  });

  test("the list hooks send only complete filters, in both API layers", () => {
    for (const api of ["rest", "trpc"] as const) {
      const outDir = tmp(`filter-hooks-${api}`);
      generateQuery(api, outDir);
      const hook = read(outDir, "query", "hooks", "use-crud.ts");
      expect(hook).toContain("filters?: Crud.FilterGroup;");
      expect(hook).toContain("completeFilters(");
    }
  });

  test("the schemas endpoint returns relations, which the filter bar reads, in both API layers", () => {
    const trpcDir = tmp("filter-schemas-trpc");
    generateRestOfApi("trpc", trpcDir);
    expect(read(trpcDir, "server", "trpc", "routers", "schemas.ts")).toContain("relations: parsedSchema.relations");

    const restDir = tmp("filter-schemas-rest");
    generateRestOfApi("rest", restDir);
    expect(read(restDir, "app", "api", "schemas", "route.ts")).toContain("relations: parsedSchema.relations");
  });
});
