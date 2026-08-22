import * as P from '../../templates/api/crud/[model]/prisma'
import * as P_id from '../../templates/api/crud/[model]/id/prisma'
import * as P_Opt from '../../templates/api/crud/[model]/options/prisma'

export function generateCRUD(schema: PrismaSchema.ParsedSchema, orm: string) {
  // Prisma's `mode: "insensitive"` is supported on PostgreSQL/MongoDB but not in sqlite
  const caseInsensitive = schema.datasource?.provider !== "sqlite";

  const indexFiles = []
  const idFiles = []
  const optionListFiles = []

  for (const model in schema.models) {

    const currModel = schema.models[model]
    const modelVar = currModel.name.charAt(0).toLowerCase() + currModel.name.slice(1);
    const prisma = `prisma.${modelVar}`;

    indexFiles.push({
      name: model, code: `
      import { prisma } from "@/lib/prisma";

      ${P.writeCreateFoo(prisma)}

      ${P.writeReadFoo(currModel, prisma, caseInsensitive)}

      ${P.writeDeleteFoo(prisma)}
    `})

    idFiles.push({
      name: model, code: `
      import { prisma } from "@/lib/prisma";

      ${P_id.writeReadFoo(prisma)}

      ${P_id.writeUpdateFoo(prisma)}

      ${P_id.writeDeleteFoo(prisma)}
    `})

    optionListFiles.push({
      name: model, code: `
      import { prisma } from "@/lib/prisma";

      ${P_Opt.writeGetOptionList(currModel, prisma, caseInsensitive)}
      `
    })
  }


}


