import fs from 'fs'
import path from 'path'
import { sanitizeProjectName } from './generate-folders'

import writeRootLayout from '../../templates/app/layout'
import writeRootPage from '../../templates/app/page'
import writeGlobalsCss from '../../templates/app/globals.css'
import writeLoginPage from '../../templates/app/login/page'

import writeAdminLayout from '../../templates/app/project_name/layout'
import writeDashboardPage from '../../templates/app/project_name/dashboard/page'
import writeDashboardLoading from '../../templates/app/project_name/dashboard/loading'
import writeRelationsPage from '../../templates/app/project_name/relations/page'
import writeRelationsLoading from '../../templates/app/project_name/relations/loading'
import writeSchemasPage from '../../templates/app/project_name/schemas/page'
import writeSchemasLoading from '../../templates/app/project_name/schemas/loading'
import writeSeederPage from '../../templates/app/project_name/seeder/page'
import writeSeederLoading from '../../templates/app/project_name/seeder/loading'
import writeDriveUploadPage from '../../templates/app/project_name/drive/page'
import writeDriveUploadLoading from '../../templates/app/project_name/drive/loading'
import writeDriveViewPage from '../../templates/app/project_name/drive/view/page'
import writeDriveViewLoading from '../../templates/app/project_name/drive/view/loading'
import writeCrudOverviewPage from '../../templates/app/project_name/crud/page'
import writeCrudOverviewLoading from '../../templates/app/project_name/crud/loading'
import writeCrudListPage from '../../templates/app/project_name/crud/[model]/page'
import writeCrudListLoading from '../../templates/app/project_name/crud/[model]/loading'
import writeCrudEditPage from '../../templates/app/project_name/crud/[model]/[id]/page'
import writeCrudEditLoading from '../../templates/app/project_name/crud/[model]/[id]/loading'
import writeCrudNewPage from '../../templates/app/project_name/crud/[model]/new/page'
import writeCrudNewLoading from '../../templates/app/project_name/crud/[model]/new/loading'

// Relative output path (under app/) -> the write function producing that file's content.
// Mirrors templates/app/'s top-level, project-agnostic files 1:1.
const APP_ROOT_FILES: Record<string, () => { toString(): string }> = {
  'layout.tsx': writeRootLayout,
  'page.tsx': writeRootPage,
  'globals.css': writeGlobalsCss,
  'login/page.tsx': writeLoginPage,
}

// Relative output path (under app/<projectName>/) -> the write function producing that file's
// content. Mirrors templates/app/project_name/ 1:1, with "project_name" resolved to the same
// sanitized project name createFolderStructure() used for app/[PROJECT_NAME]/.
const PROJECT_FILES: Record<string, () => { toString(): string }> = {
  'layout.tsx': writeAdminLayout,

  'dashboard/page.tsx': writeDashboardPage,
  'dashboard/loading.tsx': writeDashboardLoading,

  'relations/page.tsx': writeRelationsPage,
  'relations/loading.tsx': writeRelationsLoading,

  'schemas/page.tsx': writeSchemasPage,
  'schemas/loading.tsx': writeSchemasLoading,

  'seeder/page.tsx': writeSeederPage,
  'seeder/loading.tsx': writeSeederLoading,

  'drive/page.tsx': writeDriveUploadPage,
  'drive/loading.tsx': writeDriveUploadLoading,
  'drive/view/page.tsx': writeDriveViewPage,
  'drive/view/loading.tsx': writeDriveViewLoading,

  'crud/page.tsx': writeCrudOverviewPage,
  'crud/loading.tsx': writeCrudOverviewLoading,
  'crud/[model]/page.tsx': writeCrudListPage,
  'crud/[model]/loading.tsx': writeCrudListLoading,
  'crud/[model]/[id]/page.tsx': writeCrudEditPage,
  'crud/[model]/[id]/loading.tsx': writeCrudEditLoading,
  'crud/[model]/new/page.tsx': writeCrudNewPage,
  'crud/[model]/new/loading.tsx': writeCrudNewLoading,
}

// Static asset — nothing to interpolate, so it's inlined as a plain string rather than wrapped
// in a ts-poet template. NOT read via fs + __dirname/import.meta.url at runtime — that path
// doesn't survive tsup's ESM bundling (see generate-folders.ts's folder-structure.json fix).
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="6" fill="hsl(4.8387 48.4375% 25.098%)" />
  <g transform="translate(4 4)" stroke="hsl(1.5789 61.7886% 48.2353%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 12h.01" />
    <path d="M13 22c.5-.5 1.12-1 2.5-1-1.38 0-2-.5-2.5-1" />
    <path d="M14 2a3.28 3.28 0 0 1-3.227 1.798l-6.17-.561A2.387 2.387 0 1 0 4.387 8H15.5a1 1 0 0 1 0 13 1 1 0 0 0 0-5H12a7 7 0 0 1-7-7V8" />
    <path d="M14 8a8.5 8.5 0 0 1 0 8" />
    <path d="M16 16c2 0 4.5-4 4-6" />
  </g>
</svg>
`

export function generateFrontEnd(name: string, baseDir: string = process.cwd()): void {
  const appDir = path.join(baseDir, "app")

  for (const [relativePath, write] of Object.entries(APP_ROOT_FILES)) {
    const outPath = path.join(appDir, relativePath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, write().toString())
  }

  fs.writeFileSync(path.join(appDir, "icon.svg"), ICON_SVG)

  const projectDir = path.join(appDir, sanitizeProjectName(name))

  for (const [relativePath, write] of Object.entries(PROJECT_FILES)) {
    const outPath = path.join(projectDir, relativePath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, write().toString())
  }
}
