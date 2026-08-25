import fs from 'fs'
import path from 'path'
import writeParsedSchema from '../../templates/lib/parsed-schema'
import writeSeederConfig from '../../templates/lib/seeder/config'
import writeFakerPresets from '../../templates/lib/seeder/faker-presets'
import writeFieldGenerators from '../../templates/lib/seeder/field-generators'
import writeGenerateFieldValue from '../../templates/lib/seeder/generate-field-value'
import writeSeedRoute from '../../templates/api/seed/route'
import writeSeedConfigRoute from '../../templates/api/seed/config/route'

export function generateSeeder(schema: PrismaSchema.ParsedSchema, baseDir: string = process.cwd()): void {
  const libDir = path.join(baseDir, "lib")
  const seederLibDir = path.join(libDir, "seeder")
  const seedApiDir = path.join(baseDir, "app", "api", "seed")
  const seedConfigApiDir = path.join(seedApiDir, "config")

  fs.mkdirSync(seederLibDir, { recursive: true })
  fs.mkdirSync(seedConfigApiDir, { recursive: true })

  fs.writeFileSync(path.join(libDir, "parsed-schema.ts"), writeParsedSchema(schema).toString())

  const seederLibFiles: Record<string, ReturnType<typeof writeSeederConfig>> = {
    "config.ts": writeSeederConfig(),
    "faker-presets.ts": writeFakerPresets(),
    "field-generators.ts": writeFieldGenerators(),
    "generate-field-value.ts": writeGenerateFieldValue(),
  }
  for (const [fileName, code] of Object.entries(seederLibFiles)) {
    fs.writeFileSync(path.join(seederLibDir, fileName), code.toString())
  }

  fs.writeFileSync(path.join(seedApiDir, "route.ts"), writeSeedRoute().toString())
  fs.writeFileSync(path.join(seedConfigApiDir, "route.ts"), writeSeedConfigRoute().toString())
}
