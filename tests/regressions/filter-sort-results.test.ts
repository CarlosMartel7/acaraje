/**
 * Regressions for the filtering and sorting bugs fixed on feature/advanced-filter-engine. Each
 * test runs the code the generator writes: the list handlers are loaded from a freshly generated
 * app and called directly — against stubbed Prisma delegates, a compile-only PostgreSQL Kysely
 * client, or a real in-memory SQLite database (pure-SQL mode) — and the expected rows or queries
 * are spelled out per case.
 */
import fs from "fs";
import os from "os";
import path from "path";
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";

import { generateCRUD } from "../../src/steps/generate-crud";
import { prismaParser } from "../../src/steps/prisma-parser";
import { sqlParser } from "../../src/steps/sql-parser";
import writeFilterBar from "../../templates/components/routes/crud/[model]/filter-bar";
import { loadGeneratedModule, nextServerStub, trpcInitStub, TRPCErrorStub } from "../helpers/generated-module";
import { createSqliteKysely } from "../helpers/sqlite-kysely";

const SAMPLE_DBS = path.join(__dirname, "..", "sampleDBs");
const prismaSchema = prismaParser(path.join(SAMPLE_DBS, "schema.prisma"));

const tmpDirs: string[] = [];
function generate(label: string, schema: PrismaSchema.ParsedSchema, orm: string, api: "rest" | "trpc") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `acaraje-filter-regressions-${label}-`));
  tmpDirs.push(dir);
  generateCRUD(schema, orm, api, dir);
  return dir;
}
afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

/** A Prisma delegate that records the arguments of every list query. */
function recordingDelegate() {
  const calls: { findMany: any[]; count: any[] } = { findMany: [], count: [] };
  return {
    calls,
    delegate: {
      findMany: async (args: any) => (calls.findMany.push(args), []),
      count: async (args: any) => (calls.count.push(args), 0),
    },
  };
}

function prismaTrpcHandlers(appDir: string, model: string, delegateName: string) {
  const recorder = recordingDelegate();
  const mod = loadGeneratedModule(appDir, `server/trpc/routers/crud/models/${model}.ts`, {
    "@/lib/prisma": { prisma: { [delegateName]: recorder.delegate } },
    "@/server/trpc/init": trpcInitStub,
    "@trpc/server": { TRPCError: TRPCErrorStub },
  });
  return { handlers: mod.handlers, calls: recorder.calls };
}

const listInput = (overrides: Record<string, unknown> = {}) => ({ page: 1, pageSize: 50, search: "", ...overrides });

describe("REST + Prisma list route", () => {
  const appDir = generate("prisma-rest", prismaSchema, "prisma", "rest");

  function callList(query: Record<string, string>) {
    const recorder = recordingDelegate();
    const route = loadGeneratedModule(appDir, "app/api/crud/User/route.ts", {
      "next/server": nextServerStub,
      "@/lib/prisma": { prisma: { user: recorder.delegate } },
    });
    const url = `http://localhost/api/crud/User?${new URLSearchParams({ page: "1", pageSize: "20", ...query })}`;
    return route.GET({ url }).then((res: any) => ({ res, calls: recorder.calls }));
  }

  // Bug: the route classified fields with an undeclared `enumNames` and Prisma's runtime field
  // refs, so the generated project failed to type-check and every filtered or sorted request
  // answered 500.
  test("filters and sorts instead of failing", async () => {
    const { res, calls } = await callList({
      filters: JSON.stringify([{ field: "name", operator: "contains", value: "ann" }]),
      sortField: "name",
      sortOrder: "asc",
    });

    expect(res.status).toBe(200);
    expect(calls.findMany[0].where).toEqual({ AND: [{ name: { contains: "ann", mode: "insensitive" } }] });
    expect(calls.findMany[0].orderBy).toEqual([{ name: "asc" }, { id: "asc" }]);
  });

  test("rejects a filter on a field that can't be filtered with 400", async () => {
    const { res } = await callList({ filters: JSON.stringify([{ field: "products", operator: "equals", value: "x" }]) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/products/);
  });
});

describe("tRPC + Prisma list handler", () => {
  const appDir = generate("prisma-trpc", prismaSchema, "prisma", "trpc");

  // Bug: "on <minute>" compared timestamps for exact equality, so it practically never matched;
  // "after" / "on or before" ignored the rest of the chosen minute.
  test("datetime operators cover the whole chosen minute", async () => {
    const { handlers, calls } = prismaTrpcHandlers(appDir, "User", "user");
    const minute = new Date("2026-03-10T14:30:00.000Z");
    const nextMinute = new Date("2026-03-10T14:31:00.000Z");

    const cases: [string, Record<string, Date>][] = [
      ["equals", { gte: minute, lt: nextMinute }],
      ["gt", { gte: nextMinute }],
      ["gte", { gte: minute }],
      ["lt", { lt: minute }],
      ["lte", { lt: nextMinute }],
    ];
    for (const [operator] of cases) {
      // Seconds inside the minute don't move the window.
      await handlers.list(listInput({ filters: [{ field: "createdAt", operator, value: "2026-03-10T14:30:45.000Z" }] }));
    }

    expect(calls.findMany.map((c: any) => c.where.AND[0].createdAt)).toEqual(cases.map(([, expected]) => expected));
  });

  // Bug: a filter on an unknown field, or with an operator the field's type doesn't support, was
  // silently dropped — the page then showed more rows than the filters asked for.
  test.each([
    [{ field: "doesNotExist", operator: "equals", value: "x" }, /doesNotExist/],
    [{ field: "products", operator: "equals", value: "x" }, /products/],
    [{ field: "createdAt", operator: "contains", value: "2026" }, /contains/],
  ])("rejects %j instead of ignoring it", async (filter, message) => {
    const { handlers, calls } = prismaTrpcHandlers(appDir, "User", "user");
    await expect(handlers.list(listInput({ filters: [filter] }))).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(message) });
    expect(calls.findMany).toHaveLength(0);
  });

  // Bug: Number("Infinity") passed validation and reached the database as a non-finite number.
  test("rejects a non-finite number", async () => {
    const { handlers } = prismaTrpcHandlers(appDir, "Product", "product");
    await expect(
      handlers.list(listInput({ filters: [{ field: "stock", operator: "gt", value: "Infinity" }] })),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // Bug: sorting by a non-unique column (or not sorting at all on a model without createdAt) gave
  // the database no total order, so offset pagination could repeat or skip rows between pages.
  test("orders by the primary key last, so pages are stable", async () => {
    const product = prismaTrpcHandlers(appDir, "Product", "product");
    await product.handlers.list(listInput({ sortField: "status", sortOrder: "asc" }));
    await product.handlers.list(listInput());
    expect(product.calls.findMany[0].orderBy).toEqual([{ status: "asc" }, { id: "asc" }]);
    expect(product.calls.findMany[1].orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);

    const category = prismaTrpcHandlers(appDir, "Category", "category");
    await category.handlers.list(listInput());
    expect(category.calls.findMany[0].orderBy).toEqual([{ id: "desc" }]);
  });
});

describe("pure-SQL list handler on SQLite (real database)", () => {
  const SCHEMA_SQL = `
CREATE TABLE "Owner" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL
);

CREATE TABLE "Item" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', -- @enum DRAFT | LIVE
  "ownerId" INTEGER REFERENCES "Owner"("id"),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
  // Row 2 and row 4 carry SQLite's CURRENT_TIMESTAMP format; rows 1 and 3 the ISO strings the
  // panel itself writes (lib/model-store.ts).
  const ROWS_SQL = `
INSERT INTO "Owner" ("name") VALUES ('first'), ('second');
INSERT INTO "Item" ("name", "active", "status", "ownerId", "createdAt") VALUES
  ('100% cotton', 1, 'DRAFT', 1, '2026-03-10T14:30:25.000Z'),
  ('1000 cotton', 0, 'LIVE', 2, '2026-03-10 14:30:59'),
  ('a_c', 1, 'LIVE', 1, '2026-03-10T14:31:00.000Z'),
  ('abc', 0, 'DRAFT', 2, '2026-03-09 08:00:00');
`;

  const schemaFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-filter-regressions-schema-")), "schema.sql");
  tmpDirs.push(path.dirname(schemaFile));
  fs.writeFileSync(schemaFile, SCHEMA_SQL);
  const appDir = generate("sql-sqlite", sqlParser(schemaFile, "Sqlite"), "pure-sql", "trpc");

  const { db, close } = createSqliteKysely(SCHEMA_SQL + ROWS_SQL);
  afterAll(close);

  const handlers = loadGeneratedModule(appDir, "server/trpc/routers/crud/models/Item.ts", {
    "@/lib/db": { db },
    "@/server/trpc/init": trpcInitStub,
    "@trpc/server": { TRPCError: TRPCErrorStub },
  }).handlers;

  async function ids(overrides: Record<string, unknown>) {
    const page = await handlers.list(listInput(overrides));
    return page.records.map((r: any) => r.id);
  }
  const where = (field: string, operator: string, value: string) => ({ filters: [{ field, operator, value }] });

  // Bug: '%' and '_' typed by the user were passed to LIKE unescaped and acted as wildcards.
  test("treats % and _ in filters and search as literal characters", async () => {
    expect(await ids(where("name", "contains", "0%"))).toEqual([1]);
    expect(await ids(where("name", "contains", "a_c"))).toEqual([3]);
    expect(await ids(where("name", "startsWith", "100%"))).toEqual([1]);
    expect(await ids({ search: "_" })).toEqual([3]);
  });

  // Bug: booleans and dates were bound as JS values, which SQLite drivers refuse, so these filters
  // failed with a 500.
  test("filters booleans", async () => {
    expect(await ids(where("active", "equals", "true"))).toEqual([3, 1]);
    expect(await ids(where("active", "equals", "false"))).toEqual([2, 4]);
  });

  test("filters datetimes stored in either SQLite text format", async () => {
    const minute = "2026-03-10T14:30:00.000Z";
    expect(await ids(where("createdAt", "equals", minute))).toEqual([2, 1]);
    expect(await ids(where("createdAt", "gt", minute))).toEqual([3]);
    expect(await ids(where("createdAt", "gte", minute))).toEqual([3, 2, 1]);
    expect(await ids(where("createdAt", "lt", minute))).toEqual([4]);
    expect(await ids(where("createdAt", "lte", minute))).toEqual([2, 1, 4]);
  });

  // Bug: SQLite compared the two text formats character by character ("2026-03-10 14:30:59"
  // sorted before "2026-03-10T14:30:25.000Z"), so datetime sorting wasn't chronological.
  test("sorts datetimes chronologically across both text formats", async () => {
    expect(await ids({ sortField: "createdAt", sortOrder: "asc" })).toEqual([4, 1, 2, 3]);
    expect(await ids({})).toEqual([3, 2, 1, 4]);
  });

  // Bug: foreign-key columns are plain columns in pure-SQL mode, but were excluded from filters
  // and sorting (Prisma mode allows the same columns, e.g. sellerId).
  test("filters and sorts on foreign-key columns", async () => {
    expect(await ids(where("ownerId", "equals", "2"))).toEqual([2, 4]);
    expect(await ids({ sortField: "ownerId", sortOrder: "asc" })).toEqual([1, 3, 2, 4]);
  });

  test("pseudo-enum columns filter by value, and ties sort by id", async () => {
    expect(await ids(where("status", "equals", "LIVE"))).toEqual([3, 2]);
    expect(await ids({ sortField: "status", sortOrder: "asc" })).toEqual([1, 4, 2, 3]);
    expect(await ids({ sortField: "status", sortOrder: "desc" })).toEqual([3, 2, 4, 1]);
  });
});

describe("pure-SQL list handler on PostgreSQL (compiled SQL)", () => {
  const pgSchema = sqlParser(path.join(SAMPLE_DBS, "schema.postgresql.sql"), "PostgreSql");
  const appDir = generate("sql-postgres", pgSchema, "pure-sql", "trpc");

  // Compile-only client: queries are compiled for PostgreSQL and recorded, never sent anywhere.
  const queries: { sql: string; parameters: readonly unknown[] }[] = [];
  const db = new Kysely<any>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (k) => new PostgresIntrospector(k),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
    log: (event) => {
      if (event.level === "query") queries.push({ sql: event.query.sql, parameters: event.query.parameters });
    },
  });
  const handlers = loadGeneratedModule(appDir, "server/trpc/routers/crud/models/User.ts", {
    "@/lib/db": { db },
    "@/server/trpc/init": trpcInitStub,
    "@trpc/server": { TRPCError: TRPCErrorStub },
  }).handlers;

  // Bug: case-insensitive "equals" used ILIKE with the raw value, so "a_c" also matched "abc".
  test("case-insensitive equals escapes LIKE wildcards", async () => {
    queries.length = 0;
    await handlers.list(listInput({ filters: [{ field: "name", operator: "equals", value: "a_c" }] }));
    const select = queries.find((q) => q.sql.startsWith("select *"))!;
    expect(select.sql).toContain(`"name" ilike $1 escape '!'`);
    expect(select.parameters[0]).toBe("a!_c");
  });
});

describe("filter bar field rules (shared with the client)", () => {
  // Bug: the client only knew Prisma type names, so a pure-SQL panel found no filterable field
  // (TEXT, INTEGER, TIMESTAMP, ...) and hid the whole filter and sort bar.
  const CAMEL = { user: "User", product: "Product", seller: "sellerId", category: "categoryId", created: "createdAt" };
  const SNAKE = { user: "user", product: "product", seller: "seller_id", category: "category_id", created: "created_at" };
  test.each([
    ["schema.sqlite.sql", "Sqlite", CAMEL],
    ["schema.postgresql.sql", "PostgreSql", CAMEL],
    ["schema.mysql.sql", "Mysql", SNAKE],
  ] as const)("finds the filterable fields of a %s schema", (file, dialect, n) => {
    const schema = sqlParser(path.join(SAMPLE_DBS, file), dialect);
    const appDir = generate(`rules-${dialect}`, schema, "pure-sql", "rest");
    const rules = loadGeneratedModule(appDir, "lib/crud/resolve-filters.ts");
    const enumNames = new Set(schema.enums.map((e) => e.name));
    const model = (name: string) => schema.models.find((m) => m.name === name)!;
    const filterable = (name: string) => model(name).fields.filter((f) => rules.isFilterableField(f, enumNames)).map((f) => f.name);

    expect(filterable(n.user)).toEqual(["id", "email", "name", "role", n.created]);
    expect(filterable(n.product)).toEqual(["id", "name", "price", "stock", "status", n.seller, n.category, n.created]);

    const role = model(n.user).fields.find((f) => f.name === "role")!;
    expect(rules.getFieldKind(role, enumNames)).toBe("enum");
    expect(rules.enumValuesFor(role, schema.enums)).toEqual(["ADMIN", "SELLER", "BUYER"]);
  });

  // Bug: the datetime input's local wall-clock value was sent as-is and parsed in the server's
  // timezone, so filters were off by the browser's UTC offset.
  test("datetime filter values travel as UTC instants and show as local time", () => {
    const appDir = generate("rules-tz", prismaSchema, "prisma", "rest");
    const rules = loadGeneratedModule(appDir, "lib/crud/resolve-filters.ts");
    // Expected values come from local date components, so the test holds in any timezone.
    const localMinute = new Date(2026, 2, 10, 11, 30);
    expect(rules.toFilterDateTime("2026-03-10T11:30")).toBe(localMinute.toISOString());
    expect(rules.fromFilterDateTime(localMinute.toISOString())).toBe("2026-03-10T11:30");
    expect(rules.toFilterDateTime("2026-03-10T11:30")).toMatch(/Z$/);
    expect(rules.toFilterDateTime("")).toBe("");
    expect(rules.fromFilterDateTime("not a date")).toBe("");

    const filterBar = writeFilterBar();
    expect(filterBar).toContain("toFilterDateTime(");
    expect(filterBar).toContain("fromFilterDateTime(");
  });
});
