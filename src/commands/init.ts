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
  buildInstallModePrompt,
  buildSchemaSourcePrompts,
  InstallModeAnswers,
  SchemaSourceAnswers,
} from "../shared/schema-prompts";
import { ApiLayer, writeAcarajeConfig } from "../shared/api-layer";
import {
  DESIGN_FILE,
  DesignConfig,
  DesignConfigInput,
  readDesignConfig,
  validateDesignConfig,
  writeDesignConfig,
} from "../shared/design-config";

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
// storage/api/docker are undefined when skipped (design-driven installation, or `--api`).
type RestOfPromptAnswers = {
  storage?: "minio" | "gcs";
  api?: ApiLayer;
  docker?: boolean;
  username: string;
  password: string;
};

// Built lazily inside C() (not at module scope) — @clack/prompts' group() starts rendering
// interactive UI the instant it's called, and this module is imported unconditionally by
// src/index.ts, so constructing it at module scope used to kick off a live prompt session even
// for `--help` or an unrecognized command, before commander ever decided whether to run init.
// name/orm/prov/schemaPath are asked first via buildSchemaSourcePrompts() (shared with
// `acaraje update schema`); this covers everything init needs beyond that. `apiPreset` is the
// `--api` flag's value, if passed — the API layer prompt is skipped when it's set. With
// `fromDesign`, acaraje-design.json already answered storage/api/docker, so only the admin
// credentials (which never live in that file) are asked.
function buildPrompts({ apiPreset, fromDesign = false }: { apiPreset?: ApiLayer; fromDesign?: boolean }) {
  return p.group(
    {
      storage: () => {
        if (fromDesign) return;
        return p.select({
          message: "Select your storage",
          options: [
            { value: "minio", label: "MinIO (local/AWS-Integration)" },
            { value: "gcs", label: "Google Cloud Storage" },
          ],
        });
      },

      // Returning undefined skips the prompt — `--api <layer>` was already passed, or the design
      // file answered it.
      api: () => {
        if (apiPreset || fromDesign) return;
        return p.select({
          message: "Select your API layer",
          options: [
            { value: "rest", label: "TanStack Query + REST routes" },
            { value: "trpc", label: "tRPC (on TanStack Query)" },
          ],
        });
      },

      docker: () => {
        if (fromDesign) return;
        return p.select({
          message:
            "Are you going to use Docker locally for your storage or database?",
          options: [
            { value: true, label: "Yes" },
            { value: false, label: "No" },
          ],
        });
      },

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

export type InitOptions = {
  api?: ApiLayer;
};

// The developer chose the design-driven installation, so a missing or invalid file is fatal:
// report every problem at once and stop before anything is generated.
function loadDesignOrExit(): DesignConfig {
  const result = readDesignConfig();
  if (result.ok) return result.config;
  p.cancel(
    `Cannot use ${DESIGN_FILE}:\n${result.issues.map((issue) => `  - ${issue}`).join("\n")}`
  );
  process.exit(1);
}

// Basic installation: turn the prompt answers into the same effective design a design-driven
// installation produces, so both paths generate (and record) the panel the same way.
async function askBasicDesign(apiPreset?: ApiLayer) {
  const { name, orm, prov, schemaPath } =
    (await buildSchemaSourcePrompts()) as SchemaSourceAnswers;
  const answers = (await buildPrompts({ apiPreset })) as RestOfPromptAnswers;

  const input: DesignConfigInput = {
    PANEL: {
      config: {
        name: orDefault(name, "Acaraje"),
        ...(answers.api ? { api: answers.api } : {}),
        docker: answers.docker ?? false,
      },
    },
    DATABASE: {
      config:
        orm === "prisma"
          ? { orm, schemaPath: orDefault(schemaPath, "/prisma") }
          : { orm, provider: prov!, schemaPath: orDefault(schemaPath, "/database") },
    },
    STORAGE: { enable: true, config: { provider: answers.storage ?? "minio" } },
  };

  // The prompts validate the same rules as the design schema, so this only fails on a bug.
  const result = validateDesignConfig(input);
  if (!result.ok) throw new Error(`Invalid installation answers:\n${result.issues.join("\n")}`);
  return { design: result.config, answers };
}

const C = async (opts: InitOptions = {}) => {
  p.intro("Create Acaraje Admin Panel");

  const { useDesignFile } = (await buildInstallModePrompt()) as InstallModeAnswers;

  let design: DesignConfig;
  let answers: RestOfPromptAnswers;
  if (useDesignFile === true) {
    design = loadDesignOrExit();
    answers = (await buildPrompts({ apiPreset: opts.api, fromDesign: true })) as RestOfPromptAnswers;
  } else {
    ({ design, answers } = await askBasicDesign(opts.api));
  }

  // A command-line flag beats the design file, which beats the default (see README).
  if (opts.api) {
    design = { ...design, PANEL: { config: { ...design.PANEL.config, api: opts.api } } };
  }

  const { name, api, docker } = design.PANEL.config;
  const database = design.DATABASE.config;
  const orm = database.orm;
  const prov = database.orm === "pure-sql" ? database.provider : undefined;
  const storage = design.STORAGE.config.provider;
  const username = orDefault(answers.username, "admin");
  const password = orDefault(answers.password, "password");

  // schemaPath is a project-relative folder (e.g. "/prisma"), not a file path — join it with
  // cwd and the expected filename before handing it to the parsers, which just read whatever
  // path they're given.
  const schemaFileName = prov ? "schema.sql" : "schema.prisma";
  const resolvedSchemaPath = path.join(process.cwd(), database.schemaPath, schemaFileName);

  const schema = orm === "prisma"
    ? prismaParser(resolvedSchemaPath)
    : sqlParser(resolvedSchemaPath, SQL_DB_TYPES[prov!]);
  createFolderStructure(name, schema, api)

  generateCRUD(schema, orm, api)
  generateStorage(storage, api)
  generateSeeder(schema, api)
  generateRestOfApi(api)
  generateAuth()
  generateComponents(name, api)
  generateFrontEnd(name)
  generateQuery(api)
  generateConfigFiles(name, resolveDbProvider(orm, prov, schema), storage, docker, username, password, api)
  // Both installation modes record the effective design; acaraje.config.json stays for
  // `acaraje update schema` and projects generated by earlier versions.
  writeDesignConfig(design)
  writeAcarajeConfig({ api })

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
