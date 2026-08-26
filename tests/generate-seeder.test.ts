import fs from "fs";
import os from "os";
import path from "path";

import { generateSeeder } from "../src/steps/generate-seeder";
import { prismaParser } from "../src/steps/prisma-parser";
import { writeLog } from "./logger";

const SCHEMA_PATH = path.join(__dirname, "sampleDBs", "schema.prisma");
const schema = prismaParser(SCHEMA_PATH);
const modelNames = schema.models.map((m) => m.name).sort();

function libPath(outDir: string, ...segments: string[]) {
  return path.join(outDir, "lib", ...segments);
}

function seedRoutePath(outDir: string, ...segments: string[]) {
  return path.join(outDir, "app", "api", "seed", ...segments, "route.ts");
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-seeder-"));
generateSeeder(schema, outDir);

const files = {
  parsedSchema: fs.readFileSync(libPath(outDir, "parsed-schema.ts"), "utf-8"),
  seederConfig: fs.readFileSync(libPath(outDir, "seeder", "config.ts"), "utf-8"),
  fakerPresets: fs.readFileSync(libPath(outDir, "seeder", "faker-presets.ts"), "utf-8"),
  fieldGenerators: fs.readFileSync(libPath(outDir, "seeder", "field-generators.ts"), "utf-8"),
  generateFieldValue: fs.readFileSync(libPath(outDir, "seeder", "generate-field-value.ts"), "utf-8"),
  seedRoute: fs.readFileSync(seedRoutePath(outDir), "utf-8"),
  seedConfigRoute: fs.readFileSync(seedRoutePath(outDir, "config"), "utf-8"),
};

writeLog("generate-seeder", { outDir, modelNames, files });

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("writes lib/parsed-schema.ts, every lib/seeder file, and both app/api/seed routes", () => {
  expect(fs.existsSync(libPath(outDir, "parsed-schema.ts"))).toBe(true);
  for (const file of ["config.ts", "faker-presets.ts", "field-generators.ts", "generate-field-value.ts"]) {
    expect(fs.existsSync(libPath(outDir, "seeder", file))).toBe(true);
  }
  expect(fs.existsSync(seedRoutePath(outDir))).toBe(true);
  expect(fs.existsSync(seedRoutePath(outDir, "config"))).toBe(true);
});

test("bakes every schema model into lib/parsed-schema.ts", () => {
  for (const name of modelNames) {
    expect(files.parsedSchema).toContain(`"name": "${name}"`);
  }
  expect(files.parsedSchema).toContain("export const parsedSchema: PrismaSchema.ParsedSchema = {");
});

test("lib/seeder/config.ts reads and writes the config file via fs and path", () => {
  expect(files.seederConfig).toContain('import fs from "fs";');
  expect(files.seederConfig).toContain('import path from "path";');
  expect(files.seederConfig).toContain("export function readSeederConfig(");
  expect(files.seederConfig).toContain("export function writeSeederConfig(");
  expect(files.seederConfig).toContain("acaraje.seeder.json");
});

test("lib/seeder/field-generators.ts imports FAKER_PRESETS and exports the seedable-field helpers", () => {
  expect(files.fieldGenerators).toContain('import { FAKER_PRESETS } from "@/lib/seeder/faker-presets";');
  expect(files.fieldGenerators).toContain("export function isSeedableField(");
  expect(files.fieldGenerators).toContain("export function sanitizeFieldRule(");
});

test("lib/seeder/generate-field-value.ts imports faker and field-generators via ts-poet imp", () => {
  expect(files.generateFieldValue).toContain('import { faker } from "@faker-js/faker";');
  expect(files.generateFieldValue).toContain(
    'import { isRuleCompatibleWithType } from "@/lib/seeder/field-generators";',
  );
  expect(files.generateFieldValue).toContain("faker.internet.email()");
  expect(files.generateFieldValue).toContain("export function generateFieldValue(");
  expect(files.generateFieldValue).toContain("export function shouldSkipOptionalField(");
});

test("app/api/seed routes are baked against the generated parsed-schema and prisma client", () => {
  expect(files.seedRoute).toMatch(/import \{ parsedSchema \} from ['"]@\/lib\/parsed-schema['"];/);
  expect(files.seedRoute).toMatch(/import \{ prisma \} from ['"]@\/lib\/prisma['"];/);
  expect(files.seedConfigRoute).toMatch(/import \{ parsedSchema \} from ['"]@\/lib\/parsed-schema['"];/);
});

test("seed route exposes POST (seed a model) and GET (row counts)", () => {
  expect(files.seedRoute).toContain("export async function POST(");
  expect(files.seedRoute).toContain("export async function GET(");
});

test("seed config route exposes GET (read config) and PUT (update config)", () => {
  expect(files.seedConfigRoute).toContain("export async function GET(");
  expect(files.seedConfigRoute).toContain("export async function PUT(");
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const content of Object.values(files)) {
    expect(content).not.toContain("[object Object]");
  }
});

// KNOWN FAILURE: app/api/seed/route.ts contains `.find(...)?.;` — a dangling optional-chain with
// nothing after the dot, which is invalid TypeScript syntax. dprint-node can't parse it, so
// ts-poet's formatter silently falls back to raw (single-quoted, unformatted) output for that one
// file instead of throwing. This test pins that regression; it will pass once the template is fixed.
test("dprint successfully formats every generated file (double-quoted imports, not the raw single-quoted fallback)", () => {
  for (const content of Object.values(files)) {
    expect(content).not.toMatch(/from '/);
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = files.seedConfigRoute;
  expect(() => generateSeeder(schema, outDir)).not.toThrow();
  const after = fs.readFileSync(seedRoutePath(outDir, "config"), "utf-8");
  expect(after).toBe(before);
});
