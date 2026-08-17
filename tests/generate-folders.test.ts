import fs from "fs";
import os from "os";
import path from "path";

import { createFolderStructure } from "../src/lib/generate-folders";
import { prismaParser } from "../src/lib/prisma-parser";
import { sqlParser } from "../src/lib/sql-parser";
import { writeLog } from "./logger";

const SCHEMA_PATH = path.join(__dirname, "sampleDBs", "schema.prisma");
const schema = prismaParser(SCHEMA_PATH);
const modelNames = schema.models.map((m) => m.name).sort();

function walk(dir: string, base = dir): string[] {
  const paths: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(path.relative(base, full));
      paths.push(...walk(full, base));
    }
  }
  return paths.sort();
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-folders-"));
createFolderStructure("Acaraje", schema, outDir);
const tree = walk(outDir);

writeLog("generate-folders", { baseDir: outDir, projectName: "Acaraje", modelNames, tree });

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("creates the top-level Next.js scaffold folders", () => {
  expect(tree).toEqual(expect.arrayContaining(["app", "components", "lib", "query"]));
});

test("substitutes [PROJECT_NAME] with the given name", () => {
  expect(tree).toContain(path.join("app", "Acaraje"));
  expect(tree).toContain(path.join("app", "Acaraje", "dashboard"));
  expect(tree).toContain(path.join("app", "Acaraje", "crud", "[model]"));
});

test("leaves the page-level crud dynamic-route segment literal", () => {
  expect(tree).toContain(path.join("app", "Acaraje", "crud", "[model]", "[id]"));
  expect(tree).toContain(path.join("app", "Acaraje", "crud", "[model]", "[new]"));
});

test("expands [MODEL_NAME] in the api crud routes into one folder per schema model", () => {
  for (const name of modelNames) {
    expect(tree).toContain(path.join("app", "api", "crud", name, "[id]"));
    expect(tree).toContain(path.join("app", "api", "crud", name, "options"));
  }

  // and nothing left over named "[MODEL_NAME]" or "[model]" under app/api/crud
  const apiCrudChildren = tree
    .filter((p) => p.startsWith(`${path.join("app", "api", "crud")}${path.sep}`))
    .map((p) => p.split(path.sep)[3]);
  expect(new Set(apiCrudChildren)).toEqual(new Set(modelNames));
});

test("expands [QUERY_MODEL] into one folder per schema model, alongside the static query folders", () => {
  const queryChildren = tree
    .filter((p) => p.startsWith(`query${path.sep}`) && p.split(path.sep).length === 2)
    .map((p) => p.split(path.sep)[1])
    .sort();

  expect(queryChildren).toEqual(["auth", "seeder", "storage", "utils", ...modelNames].sort());
});

test("is idempotent — running twice doesn't throw or duplicate entries", () => {
  expect(() => createFolderStructure("Acaraje", schema, outDir)).not.toThrow();
  expect(walk(outDir)).toEqual(tree);
});

test("also works from a sql-parser ParsedSchema (SQLite dialect)", () => {
  const sqliteSchema = sqlParser(path.join(__dirname, "sampleDBs", "schema.sqlite.sql"), "Sqlite");
  const sqlOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-folders-sql-"));

  try {
    createFolderStructure("Acaraje", sqliteSchema, sqlOutDir);
    const sqlTree = walk(sqlOutDir);

    for (const model of sqliteSchema.models) {
      expect(sqlTree).toContain(path.join("query", model.name));
    }
  } finally {
    fs.rmSync(sqlOutDir, { recursive: true, force: true });
  }
});
