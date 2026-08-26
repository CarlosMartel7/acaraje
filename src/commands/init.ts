import * as p from "@clack/prompts";
import z from "zod";
import { prismaParser } from "../steps/prisma-parser";
import { sqlParser, SqlDatabaseType } from "../steps/sql-parser";
import { createFolderStructure } from "../steps/generate-folders";
import { generateCRUD } from "../steps/generate-crud";
import { generateStorage } from "../steps/generate-storage";
import { generateSeeder } from "../steps/generate-seeder";

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

const prompts = p.group(
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

const C = async () => {
  p.intro("Create Acaraje Admin Panel");

  let { name, orm, prov, schemaPath, storage, docker, username, password } =
    (await prompts) as PromptAnswers;

  name = orDefault(name, "Acaraje");
  schemaPath = orDefault(schemaPath, prov ? "/database" : "/prisma");
  username = orDefault(username, "admin");
  password = orDefault(password, "password");

  // The "prov" prompt only runs (and is only skipped) in lockstep with "orm" !== "prisma",
  // so it's always answered by the time we reach the pure-sql branch here.
  const schema = orm === "prisma"
    ? prismaParser(schemaPath)
    : sqlParser(schemaPath, SQL_DB_TYPES[prov!]);
  createFolderStructure(name, schema)

  generateCRUD(schema, orm)
  generateStorage(storage)
  generateSeeder(schema)

  // generateRestOfApi(schema)
  // generateFECoonents(schema, storage)
  // generatePages(schema, storage)
  // ])
  //
  // writeConfigFiles(docker)
  // installNodeModules()
  // generatePrismaClient()

  p.outro(
    "Acaraje Admin is ready to be used. Read the documentation to see next steps: link"
  );
};

export default C;
