import fs from "fs";
import os from "os";
import path from "path";

import { generateCRUD } from "../src/steps/generate-crud";
import { prismaParser } from "../src/steps/prisma-parser";
import { sqlParser } from "../src/steps/sql-parser";
import { loadGeneratedModule, nextServerStub } from "./helpers/generated-module";
import { createSqliteKysely } from "./helpers/sqlite-kysely";
import { writeLog } from "./logger";

const SCHEMA_PATH = path.join(__dirname, "sampleDBs", "schema.prisma");
const schema = prismaParser(SCHEMA_PATH);
const modelNames = schema.models.map((m) => m.name).sort();

function routePath(outDir: string, model: string, ...segments: string[]) {
  return path.join(outDir, "app", "api", "crud", model, ...segments, "route.ts");
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-"));
generateCRUD(schema, "prisma", "rest", outDir);

const files = Object.fromEntries(
  schema.models.map((m) => [
    m.name,
    {
      index: fs.readFileSync(routePath(outDir, m.name), "utf-8"),
      id: fs.readFileSync(routePath(outDir, m.name, "[id]"), "utf-8"),
      options: fs.readFileSync(routePath(outDir, m.name, "options"), "utf-8"),
    },
  ]),
) as Record<string, { index: string; id: string; options: string }>;

const sqlOutDirPostgres = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-pure-sql-"));
generateCRUD(schema, "pure-sql", "rest", sqlOutDirPostgres);

const sqlFiles = Object.fromEntries(
  schema.models.map((m) => [
    m.name,
    {
      index: fs.readFileSync(routePath(sqlOutDirPostgres, m.name), "utf-8"),
      id: fs.readFileSync(routePath(sqlOutDirPostgres, m.name, "[id]"), "utf-8"),
      options: fs.readFileSync(routePath(sqlOutDirPostgres, m.name, "options"), "utf-8"),
    },
  ]),
) as Record<string, { index: string; id: string; options: string }>;

writeLog(
  "generate-crud",
  { outDir, modelNames, files, sqlOutDirPostgres, sqlFiles },
  { prisma: outDir, "pure-sql": sqlOutDirPostgres },
);

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(sqlOutDirPostgres, { recursive: true, force: true });
});

test("writes an index, [id], and options route for every model", () => {
  for (const name of modelNames) {
    expect(fs.existsSync(routePath(outDir, name))).toBe(true);
    expect(fs.existsSync(routePath(outDir, name, "[id]"))).toBe(true);
    expect(fs.existsSync(routePath(outDir, name, "options"))).toBe(true);
  }
});

test("index route exposes GET, POST, and DELETE against the lowerCamel prisma delegate", () => {
  const { index } = files.OrderItem;
  expect(index).toContain("export async function GET(");
  expect(index).toContain("export async function POST(");
  expect(index).toContain("export async function DELETE(");
  expect(index).toContain("prisma.orderItem.");
});

test("[id] route exposes GET, PUT, and DELETE against the lowerCamel prisma delegate", () => {
  const { id } = files.Review;
  expect(id).toContain("export async function GET(");
  expect(id).toContain("export async function PUT(");
  expect(id).toContain("export async function DELETE(");
  expect(id).toContain("prisma.review.");
});

test("options route exposes a single GET handler against the lowerCamel prisma delegate", () => {
  const { options } = files.Category;
  expect(options).toContain("export async function GET(");
  expect(options).toContain("prisma.category.");
});

test("each generated file imports next/server exactly once (fragments were merged, not concatenated)", () => {
  for (const name of modelNames) {
    for (const content of Object.values(files[name])) {
      const matches = content.match(/from "next\/server"/g) ?? [];
      expect(matches.length).toBeLessThanOrEqual(1);
    }
  }
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const name of modelNames) {
    for (const content of Object.values(files[name])) {
      expect(content).not.toContain("[object Object]");
    }
  }
});

test("picks the first matching label field, scanning the model's own field order", () => {
  // User declares `email` before `name`, so `email` wins even though `name` is also a candidate.
  expect(files.User.options).toContain("label: r.email");
  expect(files.Category.options).toContain("label: r.name");
  expect(files.Product.options).toContain("label: r.name");
});

test("falls back to the id when no field name matches a label candidate", () => {
  for (const name of ["Order", "OrderItem", "Review"]) {
    expect(files[name].options).toContain("label: r.id");
    expect(files[name].options).not.toContain("where: {");
  }
});

test("applies Prisma's case-insensitive search mode for postgresql", () => {
  // The list route hands this to lib/crud/prisma-filters.ts, which adds mode: "insensitive".
  expect(files.User.index).toContain("caseInsensitive: true");
  expect(files.User.options).toContain('mode: "insensitive"');
});

test("rejects an unimplemented orm instead of silently doing nothing", () => {
  const emptyOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-typeorm-"));
  try {
    expect(() => generateCRUD(schema, "typeorm", "rest", emptyOutDir)).toThrow(/typeorm/);
    expect(fs.existsSync(path.join(emptyOutDir, "app"))).toBe(false);
  } finally {
    fs.rmSync(emptyOutDir, { recursive: true, force: true });
  }
});

test("pure-sql: writes an index, [id], and options route for every model", () => {
  for (const name of modelNames) {
    expect(fs.existsSync(routePath(sqlOutDirPostgres, name))).toBe(true);
    expect(fs.existsSync(routePath(sqlOutDirPostgres, name, "[id]"))).toBe(true);
    expect(fs.existsSync(routePath(sqlOutDirPostgres, name, "options"))).toBe(true);
  }
});

test("pure-sql: index route exposes GET, POST, and DELETE against the Kysely db instance and table name", () => {
  const { index } = sqlFiles.OrderItem;
  expect(index).toContain("export async function GET(");
  expect(index).toContain("export async function POST(");
  expect(index).toContain("export async function DELETE(");
  expect(index).toContain('db.selectFrom("OrderItem")');
  expect(index).toContain('db.insertInto("OrderItem")');
  expect(index).toContain('db.deleteFrom("OrderItem")');
});

test("pure-sql: [id] route exposes GET, PUT, and DELETE against the Kysely db instance and table name", () => {
  const { id } = sqlFiles.Review;
  expect(id).toContain("export async function GET(");
  expect(id).toContain("export async function PUT(");
  expect(id).toContain("export async function DELETE(");
  expect(id).toContain('db.selectFrom("Review")');
  expect(id).toContain('db.updateTable("Review")');
  expect(id).toContain('db.deleteFrom("Review")');
});

test("pure-sql: options route exposes a single GET handler against the Kysely db instance and table name", () => {
  const { options } = sqlFiles.Category;
  expect(options).toContain("export async function GET(");
  expect(options).toContain('db.selectFrom("Category")');
});

test("pure-sql: each generated file imports next/server exactly once (fragments were merged, not concatenated)", () => {
  for (const name of modelNames) {
    for (const content of Object.values(sqlFiles[name])) {
      const matches = content.match(/from "next\/server"/g) ?? [];
      expect(matches.length).toBeLessThanOrEqual(1);
    }
  }
});

test("pure-sql: never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const name of modelNames) {
    for (const content of Object.values(sqlFiles[name])) {
      expect(content).not.toContain("[object Object]");
    }
  }
});

test("pure-sql: picks the first matching label field, scanning the model's own field order", () => {
  expect(sqlFiles.User.options).toContain("label: r.email");
  expect(sqlFiles.Category.options).toContain("label: r.name");
  expect(sqlFiles.Product.options).toContain("label: r.name");
});

test("pure-sql: falls back to the id when no field name matches a label candidate", () => {
  for (const name of ["Order", "OrderItem", "Review"]) {
    expect(sqlFiles[name].options).toContain("label: r.id");
  }
});

test("pure-sql: uses ilike for postgresql and plain like for sqlite", () => {
  // The list route delegates string matching to lib/crud/kysely-filters.ts, which picks ilike/like
  // from the dialect.
  expect(sqlFiles.User.index).toContain('dialect: "postgresql"');
  expect(sqlFiles.User.options).toContain('"ilike"');

  const sqliteSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.sqlite.sql"), "Sqlite");
  const sqliteOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-pure-sql-sqlite-"));

  try {
    generateCRUD(sqliteSchema, "pure-sql", "rest", sqliteOutDir);
    const index = fs.readFileSync(routePath(sqliteOutDir, "User"), "utf-8");
    const options = fs.readFileSync(routePath(sqliteOutDir, "User", "options"), "utf-8");
    expect(index).toContain('dialect: "sqlite"');
    expect(options).not.toContain('"ilike"');
    expect(options).toContain('"like"');
  } finally {
    fs.rmSync(sqliteOutDir, { recursive: true, force: true });
  }
});

test("prisma: writes lib/prisma.ts as the client singleton, not lib/db.ts", () => {
  expect(fs.existsSync(path.join(outDir, "lib", "prisma.ts"))).toBe(true);
  expect(fs.existsSync(path.join(outDir, "lib", "db.ts"))).toBe(false);
});

test("pure-sql: writes lib/db.ts as the Kysely client singleton, not lib/prisma.ts", () => {
  expect(fs.existsSync(path.join(sqlOutDirPostgres, "lib", "db.ts"))).toBe(true);
  expect(fs.existsSync(path.join(sqlOutDirPostgres, "lib", "prisma.ts"))).toBe(false);

  // schema.prisma's datasource provider is postgresql (see the sqlFiles setup above), so the
  // Kysely client must be wired against the pg driver, not mysql2/better-sqlite3.
  const db = fs.readFileSync(path.join(sqlOutDirPostgres, "lib", "db.ts"), "utf-8");
  expect(db).toContain("PostgresDialect");
  expect(db).toContain('from "pg"');
  expect(db).not.toContain("MysqlDialect");
  expect(db).not.toContain("SqliteDialect");
});

test("pure-sql: lib/db.ts picks the Kysely dialect matching each database provider", () => {
  const mysqlSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.mysql.sql"), "Mysql");
  const sqliteSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.sqlite.sql"), "Sqlite");

  const mysqlOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-db-mysql-"));
  const sqliteOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-db-sqlite-"));

  try {
    generateCRUD(mysqlSchema, "pure-sql", "rest", mysqlOutDir);
    const mysqlDb = fs.readFileSync(path.join(mysqlOutDir, "lib", "db.ts"), "utf-8");
    expect(mysqlDb).toContain("MysqlDialect");
    expect(mysqlDb).toContain('from "mysql2"');

    generateCRUD(sqliteSchema, "pure-sql", "rest", sqliteOutDir);
    const sqliteDb = fs.readFileSync(path.join(sqliteOutDir, "lib", "db.ts"), "utf-8");
    expect(sqliteDb).toContain("SqliteDialect");
    expect(sqliteDb).toContain('from "better-sqlite3"');
    // sqlite's DATABASE_URL is a "file:" URL — the client must strip that prefix itself.
    expect(sqliteDb).toContain("sqliteFilePath");
  } finally {
    fs.rmSync(mysqlOutDir, { recursive: true, force: true });
    fs.rmSync(sqliteOutDir, { recursive: true, force: true });
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = files.User.index;
  expect(() => generateCRUD(schema, "prisma", "rest", outDir)).not.toThrow();
  const after = fs.readFileSync(routePath(outDir, "User"), "utf-8");
  expect(after).toBe(before);
});

test("also works from a sql-parser ParsedSchema and disables case-insensitive search for sqlite", () => {
  const sqliteSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.sqlite.sql"), "Sqlite");
  const sqlOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-sqlite-"));

  try {
    generateCRUD(sqliteSchema, "prisma", "rest", sqlOutDir);

    for (const model of sqliteSchema.models) {
      const index = fs.readFileSync(routePath(sqlOutDir, model.name), "utf-8");
      expect(index).toContain("export async function GET(");
      expect(index).not.toContain('mode: "insensitive"');
    }
  } finally {
    fs.rmSync(sqlOutDir, { recursive: true, force: true });
  }
});

describe("filter engine wiring (REST)", () => {
  const libCrud = (dir: string, file: string) => path.join(dir, "lib", "crud", file);
  const group = (combinator: "and" | "or", children: unknown[], not = false) => ({ type: "group", combinator, not, children });
  const condition = (field: string, operator: string, value: string) => ({ field, operator, value });
  const relation = (name: string, mode: string, where?: unknown) => ({ type: "relation", relation: name, mode, ...(where ? { where } : {}) });

  test("writes the shared rules and filter schema, plus only the adapter for the project's ORM", () => {
    for (const dir of [outDir, sqlOutDirPostgres]) {
      expect(fs.existsSync(libCrud(dir, "resolve-filters.ts"))).toBe(true);
      expect(fs.existsSync(libCrud(dir, "filter-schema.ts"))).toBe(true);
    }
    expect(fs.existsSync(libCrud(outDir, "prisma-filters.ts"))).toBe(true);
    expect(fs.existsSync(libCrud(outDir, "kysely-filters.ts"))).toBe(false);
    expect(fs.existsSync(libCrud(sqlOutDirPostgres, "kysely-filters.ts"))).toBe(true);
    expect(fs.existsSync(libCrud(sqlOutDirPostgres, "prisma-filters.ts"))).toBe(false);
  });

  test("the filter schema is derived from the generated parsed schema", () => {
    const filterSchema = fs.readFileSync(libCrud(outDir, "filter-schema.ts"), "utf-8");
    expect(filterSchema).toMatch(/import \{ parsedSchema \} from "@\/lib\/parsed-schema";/);
    expect(filterSchema).toContain("export const filterSchema = buildFilterSchema(parsedSchema);");
  });

  test("every list route resolves filters and order through the shared rules and its ORM adapter", () => {
    for (const name of modelNames) {
      for (const [index, adapterCalls] of [
        [files[name].index, ["buildPrismaListArgs("]],
        [sqlFiles[name].index, ["buildKyselyWhere(", "applyKyselyOrder(", `table: "${name}"`]],
      ] as const) {
        expect(index).toContain(`const MODEL = "${name}";`);
        expect(index).toContain('import { filterSchema } from "@/lib/crud/filter-schema";');
        expect(index).toContain("resolveListQuery(");
        expect(index).toContain("parseFiltersParam(");
        for (const call of adapterCalls) expect(index).toContain(call);
        // No filter or sort logic of its own.
        for (const inline of ["getFieldKind", "enumNames", "isOperatorValidForKind", "FIELD_KINDS"]) {
          expect(index).not.toContain(inline);
        }
      }
    }
  });

  test("pure-sql list routes pass the project's dialect to the Kysely adapter", () => {
    for (const [file, dialect] of [
      ["schema.postgresql.sql", "PostgreSql"],
      ["schema.mysql.sql", "Mysql"],
      ["schema.sqlite.sql", "Sqlite"],
    ] as const) {
      const sqlSchema = sqlParser(path.join(__dirname, "sampleDBs", file), dialect);
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-dialect-"));
      try {
        generateCRUD(sqlSchema, "pure-sql", "rest", dir);
        const first = sqlSchema.models[0].name;
        expect(fs.readFileSync(routePath(dir, first), "utf-8")).toContain(`dialect: "${sqlSchema.datasource!.provider}"`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  test("the shared rules expose each schema style's relations to filter on", () => {
    const rules = loadGeneratedModule(outDir, "lib/crud/resolve-filters.ts");

    const prismaModels = rules.buildFilterSchema(schema).models;
    expect(prismaModels.User.relations.products).toMatchObject({ target: "Product", many: true });
    expect(prismaModels.Product.relations.seller).toMatchObject({ target: "User", many: false, required: true });
    expect(prismaModels.Product.fieldKinds).toMatchObject({ sellerId: "string", status: "enum", createdAt: "datetime" });

    const pgSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.postgresql.sql"), "PostgreSql");
    const sqlModels = rules.buildFilterSchema(pgSchema).models;
    expect(sqlModels.Product.relations.sellerId).toMatchObject({ target: "User", many: false, localColumn: "sellerId", targetColumn: "id" });
    expect(sqlModels.User.relations["Product.sellerId"]).toMatchObject({ target: "Product", many: true, localColumn: "id", targetColumn: "sellerId" });
  });

  test("a Prisma list route compiles nested groups and relation filters", async () => {
    const calls: any[] = [];
    const route = loadGeneratedModule(outDir, "app/api/crud/User/route.ts", {
      "next/server": nextServerStub,
      "@/lib/parsed-schema": { parsedSchema: schema },
      "@/lib/prisma": { prisma: { user: { findMany: async (args: any) => (calls.push(args), []), count: async () => 0 } } },
    });
    const get = (filters: unknown) =>
      route.GET({ url: `http://localhost/api/crud/User?${new URLSearchParams({ filters: JSON.stringify(filters) })}` });

    const tree = group("or", [
      relation("products", "some", group("and", [condition("status", "equals", "PUBLISHED")])),
      group("and", [condition("role", "equals", "ADMIN")], true),
    ]);
    expect((await get(tree)).status).toBe(200);
    expect(calls[0].where).toEqual({
      AND: [
        {
          OR: [
            { products: { some: { AND: [{ status: { equals: "PUBLISHED" } }] } } },
            { NOT: { AND: [{ role: { equals: "ADMIN" } }] } },
          ],
        },
      ],
    });

    const unknown = await get(group("and", [relation("followers", "some")]));
    expect(unknown.status).toBe(400);
    expect(unknown.body.error).toMatch(/followers/);
  });

  test("a pure-sql list route answers nested groups and relation filters with the right rows", async () => {
    const sqliteFile = path.join(__dirname, "sampleDBs", "schema.sqlite.sql");
    const sqliteSchema = sqlParser(sqliteFile, "Sqlite");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-sqlite-rows-"));
    const { db, close } = createSqliteKysely(
      fs.readFileSync(sqliteFile, "utf-8") +
        `
INSERT INTO "User" ("email", "name", "role") VALUES ('ann@x.io', 'ann', 'SELLER'), ('bob@x.io', 'bob', 'SELLER'), ('cid@x.io', 'cid', 'BUYER');
INSERT INTO "Category" ("name") VALUES ('home');
INSERT INTO "Product" ("name", "price", "stock", "status", "sellerId", "categoryId") VALUES
  ('lamp', 30, 1, 'PUBLISHED', 1, 1), ('rake', 20, 0, 'DRAFT', 2, 1);
`,
    );
    try {
      generateCRUD(sqliteSchema, "pure-sql", "rest", dir);
      const list = async (model: string, filters: unknown) => {
        const route = loadGeneratedModule(dir, `app/api/crud/${model}/route.ts`, {
          "next/server": nextServerStub,
          "@/lib/parsed-schema": { parsedSchema: sqliteSchema },
          "@/lib/db": { db },
        });
        const query = new URLSearchParams({ filters: JSON.stringify(filters), sortField: "id", sortOrder: "asc" });
        const res = await route.GET({ url: `http://localhost/api/crud/${model}?${query}` });
        expect(res.status).toBe(200);
        return res.body.records.map((r: any) => r.id);
      };

      const sellsPublished = relation("Product.sellerId", "some", group("and", [condition("status", "equals", "PUBLISHED")]));
      expect(await list("User", group("and", [sellsPublished]))).toEqual([1]);
      expect(await list("User", group("and", [relation("Product.sellerId", "none")]))).toEqual([3]);
      expect(await list("User", group("or", [sellsPublished, condition("role", "equals", "BUYER")]))).toEqual([1, 3]);
      expect(await list("Product", group("and", [relation("sellerId", "some", group("and", [condition("name", "equals", "bob")]))]))).toEqual([2]);
      expect(await list("Product", group("and", [condition("name", "contains", "a")], true))).toEqual([]);
      // URLs from before filter groups hold a flat array.
      expect(await list("Product", [condition("stock", "gt", "0")])).toEqual([1]);
    } finally {
      close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
