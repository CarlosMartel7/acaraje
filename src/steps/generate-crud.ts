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
import writePrismaFilters from '../../templates/lib/crud/prisma-filters'
import writeKyselyFilters from '../../templates/lib/crud/kysely-filters'
import writeFilterSchema from '../../templates/lib/crud/filter-schema'
import writeBuildFormSchema from '../../templates/lib/crud/build-form-schema'
import writePrisma from '../../templates/lib/prisma'
import writeDbClient from '../../templates/lib/db'
import writeModelStore from '../../templates/lib/model-store'
import writeEnumValues from '../../templates/lib/enum-values'
import writeCrudTypes from '../../templates/trpc/routers/crud/types'
import writeCrudRouter from '../../templates/trpc/routers/crud/index'
import writePrismaCrudHandlers from '../../templates/trpc/routers/crud/prisma'
import writeKyselyCrudHandlers from '../../templates/trpc/routers/crud/sql'
import { ApiLayer } from '../shared/api-layer'

export function generateCRUD(
  schema: PrismaSchema.ParsedSchema,
  orm: string,
  api: ApiLayer = "rest",
  baseDir: string = process.cwd(),
): void {
  if (orm !== "prisma" && orm !== "pure-sql") {
    throw new Error(`CRUD generation for orm "${orm}" is not implemented yet`);
  }

  // Shared by both the prisma.ts and sql.ts route flavors (filter/sort rules, form validation) —
  // written once under lib/crud/, matching the "@/lib/crud/resolve-filters" and
  // "@/lib/crud/build-form-schema" imports both the API routes and crud components use. The ORM
  // adapter that compiles those rules into a query (prisma-filters.ts / kysely-filters.ts) is
  // written below, only for the client the project actually uses.
  const libDir = path.join(baseDir, "lib")
  const libCrudDir = path.join(libDir, "crud")
  fs.mkdirSync(libCrudDir, { recursive: true })
  fs.writeFileSync(path.join(libCrudDir, "resolve-filters.ts"), writeLibCrudFilters().toString())
  // Derived from lib/parsed-schema.ts, which generate-seeder writes alongside on init and update.
  fs.writeFileSync(path.join(libCrudDir, "filter-schema.ts"), writeFilterSchema().toString())
  fs.writeFileSync(path.join(libCrudDir, "build-form-schema.ts"), writeBuildFormSchema().toString())
  // Also needed by the seed route ("@/lib/enum-values") — written here since generate-crud
  // always runs and always writes lib/ unconditionally, giving it one source of truth.
  fs.writeFileSync(path.join(libDir, "enum-values.ts"), writeEnumValues().toString())

  // The prisma.ts and sql.ts route flavors each expect a different client singleton
  // ("@/lib/prisma" vs "@/lib/db") — only write the one that matches what was actually picked.
  // lib/model-store.ts wraps that same client for the Stats and Seeder code (written by
  // generate-rest-of-api and generate-seeder), which imports only "@/lib/model-store" and so
  // never needs to know which client the project uses.
  if (orm === "prisma") {
    fs.writeFileSync(path.join(libDir, "prisma.ts"), writePrisma().toString())
    fs.writeFileSync(path.join(libCrudDir, "prisma-filters.ts"), writePrismaFilters().toString())
    fs.writeFileSync(path.join(libDir, "model-store.ts"), writeModelStore("prisma").toString())
  } else {
    // sql-parser.ts only ever sets datasource.provider to one of postgresql/mysql/sqlite
    // (it comes straight from the validated "prov" prompt), so this cast is safe.
    const dbProvider = schema.datasource!.provider as "postgresql" | "mysql" | "sqlite"
    fs.writeFileSync(path.join(libDir, "db.ts"), writeDbClient(dbProvider).toString())
    fs.writeFileSync(path.join(libCrudDir, "kysely-filters.ts"), writeKyselyFilters().toString())
    fs.writeFileSync(path.join(libDir, "model-store.ts"), writeModelStore("pure-sql", dbProvider).toString())
  }

  if (api === "trpc") {
    generateTrpcCrud(schema, orm, baseDir)
    return
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

// One crud router (server/trpc/routers/crud/index.ts) dispatching on input.model to per-model
// handler files under ./models/ — the tRPC counterpart of app/api/crud/<Model>/**. Stale model
// files are cleared first so `acaraje update schema` drops handlers for removed models.
function generateTrpcCrud(schema: PrismaSchema.ParsedSchema, orm: string, baseDir: string) {
  const crudDir = path.join(baseDir, "server", "trpc", "routers", "crud")
  const modelsDir = path.join(crudDir, "models")
  fs.rmSync(modelsDir, { recursive: true, force: true })
  fs.mkdirSync(modelsDir, { recursive: true })

  fs.writeFileSync(path.join(crudDir, "types.ts"), writeCrudTypes().toString())
  fs.writeFileSync(
    path.join(crudDir, "index.ts"),
    writeCrudRouter(schema.models.map((m) => m.name)).toString(),
  )

  for (const currModel of schema.models) {
    const handlersCode =
      orm === "prisma"
        // Prisma's `mode: "insensitive"` is supported on PostgreSQL/MongoDB but not in sqlite
        ? writePrismaCrudHandlers(schema, currModel, schema.datasource?.provider !== "sqlite")
        : writeKyselyCrudHandlers(currModel, currModel.name, sqlDialect(schema))
    fs.writeFileSync(path.join(modelsDir, `${currModel.name}.ts`), handlersCode.toString())
  }
}

// The database a pure-SQL project targets, which the Kysely filter adapter needs for text
// matching and SQLite's value storage. sql-parser.ts only ever sets one of these three providers.
function sqlDialect(schema: PrismaSchema.ParsedSchema): S.SqlDialect {
  return schema.datasource!.provider as S.SqlDialect
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

    ${S.writeReadFoo(currModel, db, table, sqlDialect(schema))}

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
