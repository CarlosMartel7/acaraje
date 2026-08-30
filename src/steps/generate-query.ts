import fs from 'fs'
import path from 'path'

import writeQueryApi from '../../templates/lib/query/api'
import writeQueryKeys from '../../templates/lib/query/keys'
import writeQueryClient from '../../templates/lib/query/client'

import writeUseCrudHook from '../../templates/query/hooks/use-crud'
import writeUseDriveHook from '../../templates/query/hooks/use-drive'
import writeUseSchemasHook from '../../templates/query/hooks/use-schemas'
import writeUseStatsHook from '../../templates/query/hooks/use-stats'
import writeUseRelationsHook from '../../templates/query/hooks/use-relations'
import writeUseSeedHook from '../../templates/query/hooks/use-seed'

// Relative output path -> the write function producing that file's content.
// lib/query/* holds the fetch/query-client plumbing every hook imports from; query/hooks/*
// holds the hooks themselves — matches the "@/lib/query/*" and "@/query/hooks/*" import paths
// already baked into every consuming component.
const LIB_QUERY_FILES: Record<string, () => { toString(): string }> = {
  'api.ts': writeQueryApi,
  'keys.ts': writeQueryKeys,
  'client.ts': writeQueryClient,
}

const QUERY_HOOKS_FILES: Record<string, () => { toString(): string }> = {
  'use-crud.ts': writeUseCrudHook,
  'use-drive.ts': writeUseDriveHook,
  'use-schemas.ts': writeUseSchemasHook,
  'use-stats.ts': writeUseStatsHook,
  'use-relations.ts': writeUseRelationsHook,
  'use-seed.ts': writeUseSeedHook,
}

export function generateQuery(baseDir: string = process.cwd()): void {
  const libQueryDir = path.join(baseDir, "lib", "query")
  fs.mkdirSync(libQueryDir, { recursive: true })
  for (const [fileName, write] of Object.entries(LIB_QUERY_FILES)) {
    fs.writeFileSync(path.join(libQueryDir, fileName), write().toString())
  }

  const queryHooksDir = path.join(baseDir, "query", "hooks")
  fs.mkdirSync(queryHooksDir, { recursive: true })
  for (const [fileName, write] of Object.entries(QUERY_HOOKS_FILES)) {
    fs.writeFileSync(path.join(queryHooksDir, fileName), write().toString())
  }
}
