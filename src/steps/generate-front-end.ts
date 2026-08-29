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

export function generateFrontEnd(name: string, baseDir: string = process.cwd()): void {
  const appDir = path.join(baseDir, "app")

  for (const [relativePath, write] of Object.entries(APP_ROOT_FILES)) {
    const outPath = path.join(appDir, relativePath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, write().toString())
  }

  const projectDir = path.join(appDir, sanitizeProjectName(name))

  for (const [relativePath, write] of Object.entries(PROJECT_FILES)) {
    const outPath = path.join(projectDir, relativePath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, write().toString())
  }
}
