import fs from 'fs'
import path from 'path'
import { code } from 'ts-poet'
import * as P from '../../templates/api/crud/[model]/prisma'
import * as P_id from '../../templates/api/crud/[model]/id/prisma'
import * as P_Opt from '../../templates/api/crud/[model]/options/prisma'

export function generateCRUD(schema: PrismaSchema.ParsedSchema, orm: string, baseDir: string = process.cwd()): void {
  if (orm !== "prisma") {
    throw new Error(`CRUD generation for orm "${orm}" is not implemented yet`);
  }

  // Prisma's `mode: "insensitive"` is supported on PostgreSQL/MongoDB but not in sqlite
  const caseInsensitive = schema.datasource?.provider !== "sqlite";

  for (const currModel of schema.models) {
    const modelVar = currModel.name.charAt(0).toLowerCase() + currModel.name.slice(1);
    const prisma = `prisma.${modelVar}`;
    const modelDir = path.join(baseDir, "app", "api", "crud", currModel.name);
    const idDir = path.join(modelDir, "[id]");
    const optionsDir = path.join(modelDir, "options");

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

    fs.mkdirSync(modelDir, { recursive: true })
    fs.mkdirSync(idDir, { recursive: true })
    fs.mkdirSync(optionsDir, { recursive: true })

    fs.writeFileSync(path.join(modelDir, "route.ts"), indexCode.toString())
    fs.writeFileSync(path.join(idDir, "route.ts"), idCode.toString())
    fs.writeFileSync(path.join(optionsDir, "route.ts"), optionsCode.toString())
  }
}
