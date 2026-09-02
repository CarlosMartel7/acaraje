import fs from 'fs'
import path from 'path'
import { code } from 'ts-poet'
import * as P from '../../templates/api/crud/[model]/prisma'
import * as P_id from '../../templates/api/crud/[model]/id/prisma'
import * as P_Opt from '../../templates/api/crud/[model]/options/prisma'
import * as S from '../../templates/api/crud/[model]/sql'
import * as S_id from '../../templates/api/crud/[model]/id/sql'
import * as S_Opt from '../../templates/api/crud/[model]/options/sql'
import writeLibCrudFilters from '../../templates/lib/crud/resolve-filters'
import writeBuildFormSchema from '../../templates/lib/crud/build-form-schema'
import writePrisma from '../../templates/lib/prisma'
import writeDbClient from '../../templates/lib/db'
import writeEnumValues from '../../templates/lib/enum-values'

export function generateCRUD(schema: PrismaSchema.ParsedSchema, orm: string, baseDir: string = process.cwd()): void {
  if (orm !== "prisma" && orm !== "pure-sql") {
    throw new Error(`CRUD generation for orm "${orm}" is not implemented yet`);
  }

  // Shared by both the prisma.ts and sql.ts route flavors (filtering/sorting, form validation) —
  // written once under lib/crud/, matching the "@/lib/crud/resolve-filters" and
  // "@/lib/crud/build-form-schema" imports both the API routes and crud components use.
  const libDir = path.join(baseDir, "lib")
  const libCrudDir = path.join(libDir, "crud")
  fs.mkdirSync(libCrudDir, { recursive: true })
  fs.writeFileSync(path.join(libCrudDir, "resolve-filters.ts"), writeLibCrudFilters().toString())
  fs.writeFileSync(path.join(libCrudDir, "build-form-schema.ts"), writeBuildFormSchema().toString())
  // Also needed by the seed route ("@/lib/enum-values") — written here since generate-crud
  // always runs and always writes lib/ unconditionally, giving it one source of truth.
  fs.writeFileSync(path.join(libDir, "enum-values.ts"), writeEnumValues().toString())

  // The prisma.ts and sql.ts route flavors each expect a different client singleton
  // ("@/lib/prisma" vs "@/lib/db") — only write the one that matches what was actually picked.
  if (orm === "prisma") {
    fs.writeFileSync(path.join(libDir, "prisma.ts"), writePrisma().toString())
  } else {
    // sql-parser.ts only ever sets datasource.provider to one of postgresql/mysql/sqlite
    // (it comes straight from the validated "prov" prompt), so this cast is safe.
    const dbProvider = schema.datasource!.provider as "postgresql" | "mysql" | "sqlite"
    fs.writeFileSync(path.join(libDir, "db.ts"), writeDbClient(dbProvider).toString())
  }

  for (const currModel of schema.models) {
    const modelDir = path.join(baseDir, "app", "api", "crud", currModel.name);
    const idDir = path.join(modelDir, "[id]");
    const optionsDir = path.join(modelDir, "options");

    const { indexCode, idCode, optionsCode } =
      orm === "prisma"
        ? generatePrismaRoutes(schema, currModel)
        : generateKyselyRoutes(schema, currModel);

    fs.mkdirSync(modelDir, { recursive: true })
    fs.mkdirSync(idDir, { recursive: true })
    fs.mkdirSync(optionsDir, { recursive: true })

    fs.writeFileSync(path.join(modelDir, "route.ts"), indexCode.toString())
    fs.writeFileSync(path.join(idDir, "route.ts"), idCode.toString())
    fs.writeFileSync(path.join(optionsDir, "route.ts"), optionsCode.toString())
  }
}

function generatePrismaRoutes(schema: PrismaSchema.ParsedSchema, currModel: PrismaSchema.PrismaModel) {
  // Prisma's `mode: "insensitive"` is supported on PostgreSQL/MongoDB but not in sqlite
  const caseInsensitive = schema.datasource?.provider !== "sqlite";

  const modelVar = currModel.name.charAt(0).toLowerCase() + currModel.name.slice(1);
  const prisma = `prisma.${modelVar}`;

  const indexCode = code`
    import { prisma } from "@/lib/prisma";

    ${P.writeCreateFoo(prisma)}

    ${P.writeReadFoo(currModel, prisma, caseInsensitive)}

    ${P.writeDeleteFoo(prisma)}
  `

  const idCode = code`
    import { prisma } from "@/lib/prisma";

    ${P_id.writeReadFoo(prisma)}

    ${P_id.writeUpdateFoo(prisma)}

    ${P_id.writeDeleteFoo(prisma)}
  `

  const optionsCode = code`
    import { prisma } from "@/lib/prisma";

    ${P_Opt.writeGetOptionList(currModel, prisma, caseInsensitive)}
  `

  return { indexCode, idCode, optionsCode }
}

function generateKyselyRoutes(schema: PrismaSchema.ParsedSchema, currModel: PrismaSchema.PrismaModel) {
  // Raw SQL's `ilike` is only understood by PostgreSQL — MySQL and SQLite fall back to `like`.
  const caseInsensitive = schema.datasource?.provider === "postgresql";

  const db = "db";
  const table = currModel.name;

  const indexCode = code`
    import { db } from "@/lib/db";

    ${S.writeCreateFoo(db, table)}

    ${S.writeReadFoo(currModel, db, table, caseInsensitive)}

    ${S.writeDeleteFoo(db, table)}
  `

  const idCode = code`
    import { db } from "@/lib/db";

    ${S_id.writeReadFoo(db, table)}

    ${S_id.writeUpdateFoo(db, table)}

    ${S_id.writeDeleteFoo(db, table)}
  `

  const optionsCode = code`
    import { db } from "@/lib/db";

    ${S_Opt.writeGetOptionList(currModel, db, table, caseInsensitive)}
  `

  return { indexCode, idCode, optionsCode }
}
