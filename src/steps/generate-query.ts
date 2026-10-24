import fs from 'fs'
import path from 'path'
import { ApiLayer } from '../shared/api-layer'

import writeQueryApi from '../../templates/lib/query/api'
import writeQueryKeys from '../../templates/lib/query/keys'
import writeQueryClient from '../../templates/lib/query/client'

import writeUseCrudHook from '../../templates/query/hooks/use-crud'
import writeUseDriveHook from '../../templates/query/hooks/use-drive'
import writeUseSchemasHook from '../../templates/query/hooks/use-schemas'
import writeUseStatsHook from '../../templates/query/hooks/use-stats'
import writeUseRelationsHook from '../../templates/query/hooks/use-relations'
import writeUseSeedHook from '../../templates/query/hooks/use-seed'

import writeTrpcInit from '../../templates/trpc/server/init'
import writeTrpcRoot from '../../templates/trpc/server/root'
import writeTrpcRouteHandler from '../../templates/trpc/server/route-handler'
import writeTrpcClient from '../../templates/trpc/lib/client'

import writeTrpcUseCrudHook from '../../templates/trpc/hooks/use-crud'
import writeTrpcUseDriveHook from '../../templates/trpc/hooks/use-drive'
import writeTrpcUseSchemasHook from '../../templates/trpc/hooks/use-schemas'
import writeTrpcUseStatsHook from '../../templates/trpc/hooks/use-stats'
import writeTrpcUseRelationsHook from '../../templates/trpc/hooks/use-relations'
import writeTrpcUseSeedHook from '../../templates/trpc/hooks/use-seed'

type FileMap = Record<string, () => { toString(): string }>

// Relative output path -> the write function producing that file's content, per API layer.
// lib/query/* holds the fetch/query-client plumbing every hook imports from; query/hooks/*
// holds the hooks themselves — matches the "@/lib/query/*" and "@/query/hooks/*" import paths
// already baked into every consuming component. Both flavors write the same hook file names
// and exports, so components never need to know which one was picked.
const LIB_QUERY_FILES: Record<ApiLayer, FileMap> = {
  rest: {
    'api.ts': writeQueryApi,
    'keys.ts': writeQueryKeys,
    'client.ts': writeQueryClient,
  },
  // tRPC builds its own query keys and fetchers, so only the shared QueryClient factory is kept.
  trpc: {
    'client.ts': writeQueryClient,
  },
}

const QUERY_HOOKS_FILES: Record<ApiLayer, FileMap> = {
  rest: {
    'use-crud.ts': writeUseCrudHook,
    'use-drive.ts': writeUseDriveHook,
    'use-schemas.ts': writeUseSchemasHook,
    'use-stats.ts': writeUseStatsHook,
    'use-relations.ts': writeUseRelationsHook,
    'use-seed.ts': writeUseSeedHook,
  },
  trpc: {
    'use-crud.ts': writeTrpcUseCrudHook,
    'use-drive.ts': writeTrpcUseDriveHook,
    'use-schemas.ts': writeTrpcUseSchemasHook,
    'use-stats.ts': writeTrpcUseStatsHook,
    'use-relations.ts': writeTrpcUseRelationsHook,
    'use-seed.ts': writeTrpcUseSeedHook,
  },
}

// tRPC-only plumbing (project-root-relative). The routers themselves (server/trpc/routers/*)
// are written by the steps that own the matching REST routes — generate-crud, generate-seeder,
// generate-storage, generate-rest-of-api.
const TRPC_PLUMBING_FILES: FileMap = {
  'server/trpc/init.ts': writeTrpcInit,
  'server/trpc/root.ts': writeTrpcRoot,
  'app/api/trpc/[trpc]/route.ts': writeTrpcRouteHandler,
  'lib/trpc/client.ts': writeTrpcClient,
}

function writeFiles(dir: string, files: FileMap): void {
  for (const [relativePath, write] of Object.entries(files)) {
    const outPath = path.join(dir, relativePath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, write().toString())
  }
}

export function generateQuery(api: ApiLayer = "rest", baseDir: string = process.cwd()): void {
  writeFiles(path.join(baseDir, "lib", "query"), LIB_QUERY_FILES[api])
  writeFiles(path.join(baseDir, "query", "hooks"), QUERY_HOOKS_FILES[api])
  if (api === "trpc") writeFiles(baseDir, TRPC_PLUMBING_FILES)
}
