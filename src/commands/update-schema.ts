import * as p from "@clack/prompts";
import path from "path";
import { execSync } from "child_process";
import { prismaParser } from "../steps/prisma-parser";
import { sqlParser } from "../steps/sql-parser";
import { createFolderStructure } from "../steps/generate-folders";
import { generateCRUD } from "../steps/generate-crud";
import { generateSeeder } from "../steps/generate-seeder";
import {
  SQL_DB_TYPES,
  orDefault,
  buildSchemaSourcePrompts,
  SchemaSourceAnswers,
} from "../shared/schema-prompts";

function generatePrismaClient(baseDir: string = process.cwd()): void {
  execSync("npx prisma generate", { cwd: baseDir, stdio: "inherit" });
}

const C = async () => {
  p.intro("Update Acaraje Schema");

  let { name, orm, prov, schemaPath } =
    (await buildSchemaSourcePrompts()) as SchemaSourceAnswers;

  name = orDefault(name, "Acaraje");
  schemaPath = orDefault(schemaPath, prov ? "/database" : "/prisma");

  // schemaPath is a project-relative folder (e.g. "/prisma"), not a file path — join it with
  // cwd and the expected filename before handing it to the parsers, which just read whatever
  // path they're given.
  const schemaFileName = prov ? "schema.sql" : "schema.prisma";
  const resolvedSchemaPath = path.join(process.cwd(), schemaPath, schemaFileName);

  const schema = orm === "prisma"
    ? prismaParser(resolvedSchemaPath)
    : sqlParser(resolvedSchemaPath, SQL_DB_TYPES[prov!]);

  // Only re-run the generators whose output actually depends on the schema's contents — folder
  // skeletons (models added/removed), the per-model CRUD API routes, and the seeder (which bakes
  // the parsed schema into lib/parsed-schema.ts). Storage, auth, components, front-end pages, and
  // config files (.env, docker-compose.yml, package.json) don't read from `schema`, so they're
  // left untouched here — re-running them would risk clobbering credentials already in place.
  createFolderStructure(name, schema);
  generateCRUD(schema, orm);
  generateSeeder(schema);

  // Regenerating the Prisma client from the updated schema is safe (it doesn't touch the actual
  // database) — unlike `prisma db push`, which can alter or drop real data, so that's left for
  // the user to run deliberately.
  if (orm === "prisma") {
    generatePrismaClient();
  }

  p.outro(
    orm === "prisma"
      ? "Schema updated. Prisma client regenerated — run `npx prisma db push` yourself if your database needs to catch up."
      : "Schema updated."
  );
};

export default C;
