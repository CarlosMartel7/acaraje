import fs from 'fs'
import path from 'path'
import writeSchemasRoute from '../../templates/api/schemas/route'
import writeRelationsRoute from '../../templates/api/relations/route'
import writeStatsRoute from '../../templates/api/stats/route'

export function generateRestOfApi(baseDir: string = process.cwd()): void {
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
