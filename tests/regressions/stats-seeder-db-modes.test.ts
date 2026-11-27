import fs from "fs";
import os from "os";
import path from "path";

import { generateCRUD } from "../../src/steps/generate-crud";
import { generateSeeder } from "../../src/steps/generate-seeder";
import { generateRestOfApi } from "../../src/steps/generate-rest-of-api";
import { prismaParser } from "../../src/steps/prisma-parser";
import { sqlParser } from "../../src/steps/sql-parser";
import { ApiLayer } from "../../src/shared/api-layer";

// PR #7 audit, finding 1: pure-SQL projects only get lib/db.ts, yet the Stats and Seeder code
// imported "@/lib/prisma" in both API modes. In tRPC the shared root router loads those routers,
// so the missing module took the whole endpoint down. Every local import the Stats and Seeder
// code pulls in (followed transitively through lib/) must resolve to a generated file, for every
// database mode and API layer.

jest.mock("@clack/prompts", () => ({ select: jest.fn() }));

const SAMPLE_DBS = path.join(__dirname, "..", "sampleDBs");
const SCHEMAS: Record<"prisma" | "pure-sql", () => PrismaSchema.ParsedSchema> = {
  prisma: () => prismaParser(path.join(SAMPLE_DBS, "schema.prisma")),
  "pure-sql": () => sqlParser(path.join(SAMPLE_DBS, "schema.sqlite.sql"), "Sqlite"),
};

const ENTRY_FILES: Record<ApiLayer, string[]> = {
  rest: ["app/api/stats/route.ts", "app/api/seed/route.ts"],
  trpc: ["server/trpc/routers/stats.ts", "server/trpc/routers/seed.ts"],
};

// Modules other generation steps own (not run here). Anything else under "@/" must exist.
const OWNED_ELSEWHERE = new Set(["@/server/trpc/init"]);

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function resolveLocal(outDir: string, specifier: string): string | null {
  const base = path.join(outDir, specifier.slice("@/".length));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function unresolvedImports(outDir: string, entries: string[]): string[] {
  const missing = new Set<string>();
  const seen = new Set<string>();
  const queue = entries.map((entry) => path.join(outDir, entry));

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = fs.readFileSync(file, "utf-8");
    for (const [, specifier] of source.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
      if (OWNED_ELSEWHERE.has(specifier)) continue;
      const resolved = resolveLocal(outDir, specifier);
      if (resolved) queue.push(resolved);
      else missing.add(`${path.relative(outDir, file)} -> ${specifier}`);
    }
  }

  return [...missing].sort();
}

describe.each(["prisma", "pure-sql"] as const)("%s", (orm) => {
  test.each(["rest", "trpc"] as const)("%s: Stats and Seeder only import modules the CLI generated", (api) => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `acaraje-regression-${orm}-${api}-`));
    tmpDirs.push(outDir);

    const schema = SCHEMAS[orm]();
    generateCRUD(schema, orm, api, outDir);
    generateSeeder(schema, api, outDir);
    generateRestOfApi(api, outDir);

    for (const entry of ENTRY_FILES[api]) {
      expect(fs.existsSync(path.join(outDir, entry))).toBe(true);
    }
    expect(unresolvedImports(outDir, ENTRY_FILES[api])).toEqual([]);
  });
});

test.each([
  ["prisma", "@/lib/prisma", "@/lib/db"],
  ["pure-sql", "@/lib/db", "@/lib/prisma"],
] as const)("%s: lib/model-store.ts wraps the client that mode generates, and only that one", (orm, client, other) => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `acaraje-regression-store-${orm}-`));
  tmpDirs.push(outDir);
  generateCRUD(SCHEMAS[orm](), orm, "rest", outDir);

  const store = fs.readFileSync(path.join(outDir, "lib", "model-store.ts"), "utf-8");
  expect(store).toContain(`from "${client}"`);
  expect(store).not.toContain(other);
  for (const fn of ["countRecords", "sampleRecords", "createRecord"]) {
    expect(store).toContain(`export async function ${fn}(`);
  }
});
