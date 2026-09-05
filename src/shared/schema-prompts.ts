import * as p from "@clack/prompts";
import z from "zod";
import { SqlDatabaseType } from "../steps/sql-parser";
import { DbProvider } from "../../templates/config/docker-compose.yml";

// The "prov" prompt only offers lowercase option values, but sqlParser's SqlDatabaseType
// literals are capitalized — map one onto the other instead of duplicating the prompt options.
export const SQL_DB_TYPES: Record<string, SqlDatabaseType> = {
  postgresql: "PostgreSql",
  mysql: "Mysql",
  sqlite: "Sqlite",
};

// Skip validation entirely on empty/whitespace input — that case
// falls back to the default value after the prompt resolves.
export const isBlank = (value: any) => value === undefined || value.trim() === "";

export const orDefault = (value: string, fallback: string): string =>
  isBlank(value) ? fallback : value.trim();

// pure-sql already resolves "prov" straight from the prompt (its options match DbProvider
// exactly). In prisma mode there's no such prompt — the provider comes from whatever the user's
// own schema.prisma datasource block declares, which is an untyped string, so it's validated here
// rather than trusted blindly (a provider Prisma supports but this CLI doesn't, e.g. mongodb,
// would otherwise silently produce a broken docker-compose.yml).
export function resolveDbProvider(
  orm: "prisma" | "pure-sql",
  prov: "postgresql" | "mysql" | "sqlite" | undefined,
  schema: PrismaSchema.ParsedSchema,
): DbProvider {
  if (orm !== "prisma") return prov!;
  const provider = schema.datasource?.provider;
  if (provider === "postgresql" || provider === "mysql" || provider === "sqlite") return provider;
  throw new Error(
    `Unsupported datasource provider "${provider}" in schema.prisma — expected postgresql, mysql, or sqlite`,
  );
}

// @clack/prompts' group() infers each field's type from its own callback, but a callback that
// reads a sibling's `results.*` (prov reads results.orm, schemaPath reads results.prov) breaks
// that inference and collapses to `unknown`/`{}`. Annotate the resolved shape explicitly instead
// of fighting the inference.
export type SchemaSourceAnswers = {
  name: string;
  orm: "prisma" | "pure-sql";
  prov?: "postgresql" | "mysql" | "sqlite";
  schemaPath: string;
};

// Shared by `acaraje init` and `acaraje update schema` — both need to pin down which schema file
// to parse and how before diverging into their own extra prompts. Built lazily (called, not
// constructed at module scope) for the same reason as init's buildPrompts(): @clack/prompts'
// group() starts rendering interactive UI the instant it's invoked, and this module is imported
// unconditionally by src/index.ts, so evaluating it at import time would kick off a live prompt
// session even for `--help` or an unrecognized command.
export function buildSchemaSourcePrompts() {
  return p.group(
    {
      name: () =>
        p.text({
          message: "Panel name",
          placeholder: "Default: Acaraje",
          defaultValue: "Acaraje",
          validate: (value) => {
            if (isBlank(value)) return;
            const result = z
              .string()
              .trim()
              .max(15, "Name cannot exceed 15 characters")
              .safeParse(value);
            if (!result.success) {
              return result.error.issues[0]?.message;
            }
          },
        }),

      orm: () =>
        p.select({
          message: "Select your ORM",
          options: [
            { value: "prisma", label: "Prisma" },
            { value: "pure-sql", label: "No ORM (SQL via Kysely)" },
          ],
        }),

      prov: ({ results }) => {
        if (results.orm !== "pure-sql") return;
        return p.select({
          message: "Which database provider are you using?",
          options: [
            { value: "postgresql", label: "PostgreSQL" },
            { value: "mysql", label: "MySQL" },
            { value: "sqlite", label: "SQLite" },
          ],
        });
      },

      schemaPath: ({ results }) => {
        const schemaFile = results.prov ? "schema.sql" : "schema.prisma";
        const defaultPath = results.prov ? "/database" : "/prisma";
        return p.text({
          message: `Where is your ${schemaFile} located?`,
          placeholder: "Default: " + defaultPath,
          defaultValue: defaultPath,
          validate: (value) => {
            if (isBlank(value)) return;
            const result = z
              .string()
              .trim()
              .startsWith("/", "Folder name should start with '/'")
              .safeParse(value);
            if (!result.success) {
              return result.error.issues[0]?.message;
            }
          },
        });
      },
    },
    {
      onCancel: () => {
        p.cancel("Setup canceled");
        process.exit(1);
      },
    }
  );
}
