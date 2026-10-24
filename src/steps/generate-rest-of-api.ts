import fs from 'fs'
import path from 'path'
import { ApiLayer } from '../shared/api-layer'
import writeSchemasRoute from '../../templates/api/schemas/route'
import writeRelationsRoute from '../../templates/api/relations/route'
import writeStatsRoute from '../../templates/api/stats/route'
import writeSchemasRouter from '../../templates/trpc/routers/schemas'
import writeRelationsRouter from '../../templates/trpc/routers/relations'
import writeStatsRouter from '../../templates/trpc/routers/stats'

export function generateRestOfApi(api: ApiLayer = "rest", baseDir: string = process.cwd()): void {
  if (api === "trpc") {
    const routersDir = path.join(baseDir, "server", "trpc", "routers")
    fs.mkdirSync(routersDir, { recursive: true })

    const routerFiles: Record<string, () => { toString(): string }> = {
      "schemas.ts": writeSchemasRouter,
      "relations.ts": writeRelationsRouter,
      "stats.ts": writeStatsRouter,
    }
    for (const [fileName, write] of Object.entries(routerFiles)) {
      fs.writeFileSync(path.join(routersDir, fileName), write().toString())
    }
    return
  }

  const apiDir = path.join(baseDir, "app", "api")

  const routeFiles: Record<string, typeof writeSchemasRoute> = {
    schemas: writeSchemasRoute,
    relations: writeRelationsRoute,
    stats: writeStatsRoute,
  }

  for (const [routeName, write] of Object.entries(routeFiles)) {
    const routeDir = path.join(apiDir, routeName)
    fs.mkdirSync(routeDir, { recursive: true })
    fs.writeFileSync(path.join(routeDir, "route.ts"), write().toString())
  }
}
