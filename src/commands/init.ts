import * as p from "@clack/prompts";
import z from "zod";
import path from "path";
import { execSync } from "child_process";
import { prismaParser } from "../steps/prisma-parser";
import { sqlParser } from "../steps/sql-parser";
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
import {
  SQL_DB_TYPES,
  isBlank,
  orDefault,
  resolveDbProvider,
  buildSchemaSourcePrompts,
  SchemaSourceAnswers,
} from "../shared/schema-prompts";

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
// reads a sibling's `results.*` breaks that inference and collapses it to `unknown`/`{}`.
// Annotate the resolved shape explicitly instead of fighting the inference.
type RestOfPromptAnswers = {
  storage: "minio" | "gcs";
  docker: boolean;
  username: string;
  password: string;
};

// Built lazily inside C() (not at module scope) — @clack/prompts' group() starts rendering
// interactive UI the instant it's called, and this module is imported unconditionally by
// src/index.ts, so constructing it at module scope used to kick off a live prompt session even
// for `--help` or an unrecognized command, before commander ever decided whether to run init.
// name/orm/prov/schemaPath are asked first via buildSchemaSourcePrompts() (shared with
// `acaraje update schema`); this covers everything init needs beyond that.
function buildPrompts() {
  return p.group(
    {
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

  let { name, orm, prov, schemaPath } =
    (await buildSchemaSourcePrompts()) as SchemaSourceAnswers;
  let { storage, docker, username, password } =
    (await buildPrompts()) as RestOfPromptAnswers;

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
