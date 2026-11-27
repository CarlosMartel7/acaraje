import fs from 'fs'
import path from 'path'
import writeParsedSchema from '../../templates/lib/parsed-schema'
import writeSeederConfig from '../../templates/lib/seeder/config'
import writeFakerPresets from '../../templates/lib/seeder/faker-presets'
import writeFieldGenerators from '../../templates/lib/seeder/field-generators'
import writeGenerateFieldValue from '../../templates/lib/seeder/generate-field-value'
import writeSeedModel from '../../templates/lib/seeder/seed-model'
import writeSeedRoute from '../../templates/api/seed/route'
import writeSeedConfigRoute from '../../templates/api/seed/config/route'
import writeSeedRouter from '../../templates/trpc/routers/seed'
import { ApiLayer } from '../shared/api-layer'

export function generateSeeder(schema: PrismaSchema.ParsedSchema, api: ApiLayer = "rest", baseDir: string = process.cwd()): void {
  const libDir = path.join(baseDir, "lib")
  const seederLibDir = path.join(libDir, "seeder")
  const seedApiDir = path.join(baseDir, "app", "api", "seed")
  const seedConfigApiDir = path.join(seedApiDir, "config")

  fs.mkdirSync(seederLibDir, { recursive: true })

  fs.writeFileSync(path.join(libDir, "parsed-schema.ts"), writeParsedSchema(schema).toString())

  const seederLibFiles: Record<string, ReturnType<typeof writeSeederConfig>> = {
    "config.ts": writeSeederConfig(),
    "faker-presets.ts": writeFakerPresets(),
    "field-generators.ts": writeFieldGenerators(),
    "generate-field-value.ts": writeGenerateFieldValue(),
    // Shared by the REST seed route and the tRPC seed router; reaches the database through
    // "@/lib/model-store", which generate-crud writes for the project's database mode.
    "seed-model.ts": writeSeedModel(),
  }
  for (const [fileName, code] of Object.entries(seederLibFiles)) {
    fs.writeFileSync(path.join(seederLibDir, fileName), code.toString())
  }

  // The seed + seed-config endpoints: two REST routes, or one tRPC "seed" router covering both.
  if (api === "trpc") {
    const routersDir = path.join(baseDir, "server", "trpc", "routers")
    fs.mkdirSync(routersDir, { recursive: true })
    fs.writeFileSync(path.join(routersDir, "seed.ts"), writeSeedRouter().toString())
    return
  }

  fs.mkdirSync(seedConfigApiDir, { recursive: true })
  fs.writeFileSync(path.join(seedApiDir, "route.ts"), writeSeedRoute().toString())
  fs.writeFileSync(path.join(seedConfigApiDir, "route.ts"), writeSeedConfigRoute().toString())
}
