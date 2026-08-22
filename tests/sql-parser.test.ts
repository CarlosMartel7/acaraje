import path from "path";

import { sqlParser, type SqlDatabaseType } from "../src/steps/sql-parser";
import { writeLog } from "./logger";

const SAMPLE_DBS = path.join(__dirname, "sampleDBs");

const DIALECTS: { dbType: SqlDatabaseType; file: string; provider: string }[] = [
  { dbType: "Sqlite", file: "schema.sqlite.sql", provider: "sqlite" },
  { dbType: "Mysql", file: "schema.mysql.sql", provider: "mysql" },
  { dbType: "PostgreSql", file: "schema.postgresql.sql", provider: "postgresql" },
];

const results = Object.fromEntries(
  DIALECTS.map(({ dbType, file }) => [dbType, sqlParser(path.join(SAMPLE_DBS, file), dbType)]),
) as Record<SqlDatabaseType, ReturnType<typeof sqlParser>>;

writeLog("sql-parser", results);

describe.each(DIALECTS)("$dbType", ({ dbType, provider }) => {
  test("sets the datasource provider", () => {
    expect(results[dbType].datasource?.provider).toBe(provider);
  });

  test("parses every marketplace table", () => {
    const names = results[dbType].models
      .map((m) => m.name.toLowerCase().replace(/_/g, ""))
      .sort();
    expect(names).toEqual(["category", "order", "orderitem", "product", "review", "user"]);
  });

  test("marks the primary key and its auto-increment attribute", () => {
    const user = results[dbType].models.find((m) => m.name.toLowerCase() === "user")!;
    const id = user.fields.find((f) => f.name === "id")!;

    expect(id.isId).toBe(true);
    expect(id.isRequired).toBe(true);
  });

  test("marks unique columns", () => {
    const user = results[dbType].models.find((m) => m.name.toLowerCase() === "user")!;
    const email = user.fields.find((f) => f.name === "email")!;

    expect(email.isUnique).toBe(true);
  });

  test("resolves the role enum's values, however the dialect expresses it", () => {
    const user = results[dbType].models.find((m) => m.name.toLowerCase() === "user")!;
    const role = user.fields.find((f) => f.name === "role")!;

    const values =
      dbType === "PostgreSql"
        ? results[dbType].enums.find((e) => e.name === "role")?.values
        : role.pseudoEnumValues;

    expect(values).toEqual(["ADMIN", "SELLER", "BUYER"]);
  });

  test("marks the product's seller/category columns as relations", () => {
    const product = results[dbType].models.find((m) => m.name.toLowerCase() === "product")!;
    const sellerCol = product.fields.find((f) => f.name.toLowerCase().includes("seller"))!;
    const categoryCol = product.fields.find((f) => f.name.toLowerCase().includes("category"))!;

    expect(sellerCol.isRelation).toBe(true);
    expect(categoryCol.isRelation).toBe(true);
  });

  test("infers a many-to-one relation from Product to User", () => {
    const relation = results[dbType].relations.find(
      (r) => r.from.toLowerCase() === "product" && r.to.toLowerCase() === "user",
    );

    expect(relation).toBeDefined();
    expect(relation?.type).toBe("many-to-one");
  });

  test("leaves Review.comment nullable", () => {
    const review = results[dbType].models.find((m) => m.name.toLowerCase() === "review")!;
    const comment = review.fields.find((f) => f.name === "comment")!;

    expect(comment.isRequired).toBe(false);
  });

  test("captures the composite UNIQUE on Review as a raw index", () => {
    const review = results[dbType].models.find((m) => m.name.toLowerCase() === "review")!;

    expect(review.indexes.some((idx) => /UNIQUE/i.test(idx) && /author/i.test(idx))).toBe(true);
  });
});

test("MySQL: inline ENUM columns don't leak into ParsedSchema.enums (no CREATE TYPE in MySQL)", () => {
  expect(results.Mysql.enums).toEqual([]);
});

test("SQLite: has no native or named enums at all, only pseudoEnumValues comments", () => {
  expect(results.Sqlite.enums).toEqual([]);
});

test("PostgreSQL: named enum types are collected in ParsedSchema.enums", () => {
  const names = results.PostgreSql.enums.map((e) => e.name).sort();
  expect(names).toEqual(["order_status", "product_status", "role"]);
});
