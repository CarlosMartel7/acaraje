import * as p from "@clack/prompts";
import z from "zod";
import path from "path";
import { execSync } from "child_process";
import { prismaParser } from "../steps/prisma-parser";
import { sqlParser, SqlDatabaseType } from "../steps/sql-parser";
import { createFolderStructure } from "../steps/generate-folders";
import { generateCRUD } from "../steps/generate-crud";
import { generateStorage } from "../steps/generate-storage";
import { generateSeeder } from "../steps/generate-seeder";
import { generateRestOfApi } from "../steps/generate-rest-of-api";
import { generateAuth } from "../steps/generate-auth";
import { generateComponents } from "../steps/generate-components";
import { generateFrontEnd } from "../steps/generate-front-end";
import { generateQuery } from "../steps/generate-query";
import { generateConfigFiles } from "../steps/generate-config-files";
import { DbProvider } from "../../templates/config/docker-compose.yml";

// The "prov" prompt only offers lowercase option values, but sqlParser's SqlDatabaseType
// literals are capitalized — map one onto the other instead of duplicating the prompt options.
const SQL_DB_TYPES: Record<string, SqlDatabaseType> = {
  postgresql: "PostgreSql",
  mysql: "Mysql",
  sqlite: "Sqlite",
};

// Skip validation entirely on empty/whitespace input — that case
// falls back to the default value after the prompt resolves.
const isBlank = (value: any) => value === undefined || value.trim() === "";

const orDefault = (value: string, fallback: string): string =>
  isBlank(value) ? fallback : value.trim();

// pure-sql already resolves "prov" straight from the prompt (its options match DbProvider
// exactly). In prisma mode there's no such prompt — the provider comes from whatever the user's
// own schema.prisma datasource block declares, which is an untyped string, so it's validated here
// rather than trusted blindly (a provider Prisma supports but this CLI doesn't, e.g. mongodb,
// would otherwise silently produce a broken docker-compose.yml).
function resolveDbProvider(
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

function installNodeModules(baseDir: string = process.cwd()): void {
  execSync("npm install", { cwd: baseDir, stdio: "inherit" });
}

function generatePrismaClient(baseDir: string = process.cwd()): void {
  execSync("npx prisma generate", { cwd: baseDir, stdio: "inherit" });
}

function pushPrismaDb(baseDir: string = process.cwd()): void {
  execSync("npx prisma db push", { cwd: baseDir, stdio: "inherit" });
}

// @clack/prompts' group() infers each field's type from its own callback, but a callback that
// reads a sibling's `results.*` (prov reads results.orm, schemaPath reads results.prov) breaks
// that inference and collapses to `unknown`/`{}`. Annotate the resolved shape explicitly instead
// of fighting the inference.
type PromptAnswers = {
  name: string;
  orm: "prisma" | "pure-sql";
  prov?: "postgresql" | "mysql" | "sqlite";
  schemaPath: string;
  storage: "minio" | "gcs";
  docker: boolean;
  username: string;
  password: string;
};

// Built lazily inside C() (not at module scope) — @clack/prompts' group() starts rendering
// interactive UI the instant it's called, and this module is imported unconditionally by
// src/index.ts, so constructing it at module scope used to kick off a live prompt session even
// for `--help` or an unrecognized command, before commander ever decided whether to run init.
function buildPrompts() {
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

      storage: () =>
        p.select({
          message: "Select your storage",
          options: [
            { value: "minio", label: "MinIO (local/AWS-Integration)" },
            { value: "gcs", label: "Google Cloud Storage" },
          ],
        }),

      docker: () =>
        p.select({
          message:
            "Are you going to use Docker locally for your storage or database?",
          options: [
            { value: true, label: "Yes" },
            { value: false, label: "No" },
          ],
        }),

      username: () =>
        p.text({
          message: "Username",
          placeholder: "Default: admin",
          defaultValue: "admin",
          validate: (value) => {
            if (isBlank(value)) return;
            const result = z
              .string()
              .trim()
              .min(5, "Username cannot be less than 5 characters")
              .max(15, "Username cannot exceed 15 characters")
              .safeParse(value);
            if (!result.success) {
              return result.error.issues[0]?.message;
            }
          },
        }),

      password: () =>
        p.text({
          message: "Password",
          placeholder: "Default: password",
          defaultValue: "password",
          validate: (value) => {
            if (isBlank(value)) return;
            const result = z.string().trim().safeParse(value);
            if (!result.success) {
              return result.error.issues[0]?.message;
            }
          },
        }),
    },
    {
      onCancel: () => {
        p.cancel("Setup canceled");
        process.exit(1);
      },
    }
  );
}

const C = async () => {
  p.intro("Create Acaraje Admin Panel");

  let { name, orm, prov, schemaPath, storage, docker, username, password } =
    (await buildPrompts()) as PromptAnswers;

  name = orDefault(name, "Acaraje");
  schemaPath = orDefault(schemaPath, prov ? "/database" : "/prisma");
  username = orDefault(username, "admin");
  password = orDefault(password, "password");

  // schemaPath is a project-relative folder (e.g. "/prisma"), not a file path — join it with
  // cwd and the expected filename before handing it to the parsers, which just read whatever
  // path they're given.
  const schemaFileName = prov ? "schema.sql" : "schema.prisma";
  const resolvedSchemaPath = path.join(process.cwd(), schemaPath, schemaFileName);

  // The "prov" prompt only runs (and is only skipped) in lockstep with "orm" !== "prisma",
  // so it's always answered by the time we reach the pure-sql branch here.
  const schema = orm === "prisma"
    ? prismaParser(resolvedSchemaPath)
    : sqlParser(resolvedSchemaPath, SQL_DB_TYPES[prov!]);
  createFolderStructure(name, schema)

  generateCRUD(schema, orm)
  generateStorage(storage)
  generateSeeder(schema)
  generateRestOfApi()
  generateAuth()
  generateComponents(name)
  generateFrontEnd(name)
  generateQuery()
  generateConfigFiles(name, resolveDbProvider(orm, prov, schema), storage, docker, username, password)

  installNodeModules()
  if (orm === "prisma") {
    generatePrismaClient()
    pushPrismaDb()
  }

  p.outro(
    "Acaraje Admin is ready to be used. Read the documentation to see next steps: link"
  );
};

export default C;
