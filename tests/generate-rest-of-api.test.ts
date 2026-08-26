import fs from "fs";
import os from "os";
import path from "path";

import { generateRestOfApi } from "../src/steps/generate-rest-of-api";
import { writeLog } from "./logger";

const ROUTES = ["schemas", "relations", "stats"];

function routePath(outDir: string, route: string) {
  return path.join(outDir, "app", "api", route, "route.ts");
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-rest-of-api-"));
generateRestOfApi(outDir);

const files = Object.fromEntries(
  ROUTES.map((route) => [route, fs.readFileSync(routePath(outDir, route), "utf-8")]),
) as Record<string, string>;

writeLog("generate-rest-of-api", { outDir, files }, { output: outDir });

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("writes app/api/schemas, app/api/relations, and app/api/stats routes", () => {
  for (const route of ROUTES) {
    expect(fs.existsSync(routePath(outDir, route))).toBe(true);
  }
});

test("every route is baked against the generated parsed-schema, not a runtime parser", () => {
  for (const content of Object.values(files)) {
    expect(content).toMatch(/from "@\/lib\/parsed-schema"/);
  }
});

test("schemas route returns models, enums, datasource, and generator", () => {
  expect(files.schemas).toContain("models: parsedSchema.models");
  expect(files.schemas).toContain("enums: parsedSchema.enums");
  expect(files.schemas).toContain("datasource: parsedSchema.datasource");
  expect(files.schemas).toContain("generator: parsedSchema.generator");
});

test("relations route returns the inferred relations list", () => {
  expect(files.relations).toContain("relations: parsedSchema.relations");
});

test("stats route imports prisma and aggregates field/relation/index counts", () => {
  expect(files.stats).toMatch(/from "@\/lib\/prisma"/);
  expect(files.stats).toContain("totalFields");
  expect(files.stats).toContain("totalRelations");
  expect(files.stats).toContain("totalIndexes");
  expect(files.stats).toContain("relationTypeCount");
});

test("every route exposes a single GET handler", () => {
  for (const content of Object.values(files)) {
    expect(content).toContain("export async function GET(");
  }
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const content of Object.values(files)) {
    expect(content).not.toContain("[object Object]");
  }
});

test("dprint successfully formats every generated file (double-quoted imports, not the raw single-quoted fallback)", () => {
  for (const content of Object.values(files)) {
    expect(content).not.toMatch(/from '/);
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = files.stats;
  expect(() => generateRestOfApi(outDir)).not.toThrow();
  const after = fs.readFileSync(routePath(outDir, "stats"), "utf-8");
  expect(after).toBe(before);
});
