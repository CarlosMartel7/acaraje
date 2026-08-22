import fs from "fs";
import os from "os";
import path from "path";

import { generateCRUD } from "../src/steps/generate-crud";
import { prismaParser } from "../src/steps/prisma-parser";
import { sqlParser } from "../src/steps/sql-parser";
import { writeLog } from "./logger";

const SCHEMA_PATH = path.join(__dirname, "sampleDBs", "schema.prisma");
const schema = prismaParser(SCHEMA_PATH);
const modelNames = schema.models.map((m) => m.name).sort();

function routePath(outDir: string, model: string, ...segments: string[]) {
  return path.join(outDir, "app", "api", "crud", model, ...segments, "route.ts");
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-"));
generateCRUD(schema, "prisma", outDir);

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

writeLog("generate-crud", { outDir, modelNames, files });

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
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
  expect(files.User.index).toContain('mode: "insensitive"');
  expect(files.User.options).toContain('mode: "insensitive"');
});

test("rejects an unimplemented orm instead of silently doing nothing", () => {
  const emptyOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-sql-"));
  try {
    expect(() => generateCRUD(schema, "pure-sql", emptyOutDir)).toThrow(/pure-sql/);
    expect(fs.existsSync(path.join(emptyOutDir, "app"))).toBe(false);
  } finally {
    fs.rmSync(emptyOutDir, { recursive: true, force: true });
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = files.User.index;
  expect(() => generateCRUD(schema, "prisma", outDir)).not.toThrow();
  const after = fs.readFileSync(routePath(outDir, "User"), "utf-8");
  expect(after).toBe(before);
});

test("also works from a sql-parser ParsedSchema and disables case-insensitive search for sqlite", () => {
  const sqliteSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.sqlite.sql"), "Sqlite");
  const sqlOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-crud-sqlite-"));

  try {
    generateCRUD(sqliteSchema, "prisma", sqlOutDir);

    for (const model of sqliteSchema.models) {
      const index = fs.readFileSync(routePath(sqlOutDir, model.name), "utf-8");
      expect(index).toContain("export async function GET(");
      expect(index).not.toContain('mode: "insensitive"');
    }
  } finally {
    fs.rmSync(sqlOutDir, { recursive: true, force: true });
  }
});
