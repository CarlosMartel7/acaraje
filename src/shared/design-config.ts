import fs from "fs";
import path from "path";
import z from "zod";
import { API_LAYERS } from "./api-layer";

// acaraje-design.json describes an installation: what `acaraje init` generates and how. It is
// read by the CLI (init today, update commands later), never by the generated panel at runtime.
//
// Shape rules (v1):
// - Top-level keys are UPPERCASE sections. Unknown sections and unknown keys are rejected, so a
//   typo fails loudly instead of being silently ignored.
// - Core sections (PANEL, DATABASE) always apply, so they only carry `config`.
// - Feature sections carry `enable` and, where the feature owns a database table, `table` at the
//   top level; every other option lives under `config`.
// - Secrets (admin credentials, storage keys, database URLs) never go in this file — they stay in
//   the generated `.env`.
export const DESIGN_FILE = "acaraje-design.json";

export const ORMS = ["prisma", "pure-sql"] as const;
export const SQL_PROVIDERS = ["postgresql", "mysql", "sqlite"] as const;
export const STORAGE_PROVIDERS = ["minio", "gcs"] as const;

export const DEFAULT_PANEL_NAME = "Acaraje";
export const DEFAULT_SCHEMA_PATHS = { prisma: "/prisma", "pure-sql": "/database" } as const;

// Mirrors the "Panel name" prompt's validation, so both installation modes accept the same names.
const panelName = z
  .string()
  .trim()
  .min(1, "Panel name cannot be empty")
  .max(15, "Panel name cannot exceed 15 characters");

// Mirrors the "Where is your schema located?" prompt: a project-relative folder such as "/prisma".
const schemaPath = z.string().trim().startsWith("/", "Schema folder should start with '/'");

const panelSection = z.strictObject({
  config: z
    .strictObject({
      name: panelName.default(DEFAULT_PANEL_NAME),
      api: z.enum(API_LAYERS).default("rest"),
      docker: z.boolean().default(false),
    })
    .prefault({}),
});

// Prisma reads its provider from the schema's datasource block, so `provider` only exists (and is
// required) in pure-sql mode — the discriminated union rejects it under prisma.
const databaseConfig = z.discriminatedUnion("orm", [
  z.strictObject({
    orm: z.literal("prisma"),
    schemaPath: schemaPath.default(DEFAULT_SCHEMA_PATHS.prisma),
  }),
  z.strictObject({
    orm: z.literal("pure-sql"),
    provider: z.enum(SQL_PROVIDERS),
    schemaPath: schemaPath.default(DEFAULT_SCHEMA_PATHS["pure-sql"]),
  }),
]);

const databaseSection = z.strictObject({ config: databaseConfig });

// Every generated panel ships a file browser today, so storage can't be switched off yet; the
// `enable` flag is still part of the section so the shape doesn't change once it can be.
const storageSection = z.strictObject({
  enable: z.literal(true, {
    error: "must be true: every generated panel currently includes storage",
  }),
  config: z
    .strictObject({
      provider: z.enum(STORAGE_PROVIDERS).default("minio"),
    })
    .prefault({}),
});

export const designConfigSchema = z.strictObject({
  PANEL: panelSection.prefault({}),
  DATABASE: databaseSection,
  STORAGE: storageSection.prefault({ enable: true }),
});

// What a developer may write (defaults may be omitted) vs. the effective, fully-resolved design.
export type DesignConfigInput = z.input<typeof designConfigSchema>;
export type DesignConfig = z.output<typeof designConfigSchema>;

export type DesignConfigResult =
  | { ok: true; config: DesignConfig }
  | { ok: false; issues: string[] };

const SECRET_KEY = /password|secret|token|credential|private[_-]?key|api[_-]?key/i;

// Strict parsing already rejects these keys, but as a generic "unrecognized key" — call them out
// as secrets so the fix (move it to .env) is obvious.
function findSecretKeys(value: unknown, at: string[] = []): string[] {
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const keyPath = [...at, key];
    const own = SECRET_KEY.test(key)
      ? [`${keyPath.join(".")}: secrets must not be stored in ${DESIGN_FILE}; keep them in .env`]
      : [];
    return [...own, ...findSecretKeys(child, keyPath)];
  });
}

function formatIssue(issue: z.core.$ZodIssue): string {
  const where = issue.path.length ? issue.path.join(".") : "(root)";
  return `${where}: ${issue.message}`;
}

export function validateDesignConfig(raw: unknown): DesignConfigResult {
  const secretIssues = findSecretKeys(raw);
  if (secretIssues.length) return { ok: false, issues: secretIssues };

  const result = designConfigSchema.safeParse(raw);
  if (!result.success) return { ok: false, issues: result.error.issues.map(formatIssue) };
  return { ok: true, config: result.data };
}

export function designConfigPath(baseDir: string = process.cwd()): string {
  return path.join(baseDir, DESIGN_FILE);
}

export function readDesignConfig(baseDir: string = process.cwd()): DesignConfigResult {
  const file = designConfigPath(baseDir);
  let text: string;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch {
    return { ok: false, issues: [`${DESIGN_FILE} was not found at ${file}`] };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { ok: false, issues: [`${DESIGN_FILE} is not valid JSON: ${(error as Error).message}`] };
  }
  return validateDesignConfig(raw);
}

export function writeDesignConfig(config: DesignConfig, baseDir: string = process.cwd()): void {
  fs.writeFileSync(designConfigPath(baseDir), JSON.stringify(config, null, 2) + "\n");
}
