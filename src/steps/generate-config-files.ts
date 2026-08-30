import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

import writeDockerCompose, { DbProvider, StorageProvider } from '../../templates/config/docker-compose.yml'
import writeEnvFile from '../../templates/config/.env'
import writeEnvExample from '../../templates/config/.env.example'
import writePackageJson from '../../templates/config/package.json'
import writeTsconfigJson from '../../templates/config/tsconfig.json'
import writeTailwindConfig from '../../templates/config/tailwind.config.js'
import writeMiddleware from '../../templates/config/middleware'
import writeNextConfig from '../../templates/config/next.config.js'
import writePostcssConfig from '../../templates/config/postcss.config.js'
import writeVitestConfig from '../../templates/config/vitest.config.mts'
import writeInstrumentation from '../../templates/config/instrumentation'
import writeGlobalTypes from '../../templates/config/global.d'

// Relative output path (project root) -> the write function producing that file's content.
// Every config file is project-agnostic except docker-compose.yml, which is built separately
// below since it depends on the database/storage the user actually picked.
const STATIC_CONFIG_FILES: Record<string, () => { toString(): string }> = {
  '.env.example': writeEnvExample,
  'package.json': writePackageJson,
  'tsconfig.json': writeTsconfigJson,
  'tailwind.config.js': writeTailwindConfig,
  'middleware.ts': writeMiddleware,
  'next.config.js': writeNextConfig,
  'postcss.config.js': writePostcssConfig,
  'vitest.config.mts': writeVitestConfig,
  'instrumentation.ts': writeInstrumentation,
  'global.d.ts': writeGlobalTypes,
}

export function generateConfigFiles(
  dbProvider: DbProvider,
  storage: StorageProvider,
  docker: boolean,
  username: string,
  password: string,
  baseDir: string = process.cwd(),
): void {
  fs.mkdirSync(baseDir, { recursive: true })

  for (const [fileName, write] of Object.entries(STATIC_CONFIG_FILES)) {
    fs.writeFileSync(path.join(baseDir, fileName), write().toString())
  }

  const authSecret = crypto.randomBytes(32).toString("base64")
  fs.writeFileSync(
    path.join(baseDir, ".env"),
    writeEnvFile(dbProvider, storage, username, password, authSecret).toString(),
  )

  // Only write a docker-compose.yml when the user said they'd actually use Docker locally.
  if (docker) {
    fs.writeFileSync(path.join(baseDir, "docker-compose.yml"), writeDockerCompose(dbProvider, storage).toString())
  }
}
