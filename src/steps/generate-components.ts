import fs from 'fs'
import path from 'path'

import writeUtils from '../../templates/lib/utils'
import writeAcarajeRoutes from '../../templates/lib/acaraje-routes'

import writeConnectionBadgeComponent from '../../templates/components/connection-badge'
import writeSidebarComponent from '../../templates/components/sidebar'

import writeQueryProviderComponent from '../../templates/components/providers/query-provider'

import writeCrudOverviewApiCalls from '../../templates/components/routes/crud/[[api-calls]]'
import writeCrudOverviewContent from '../../templates/components/routes/crud/index'
import writeDynamicForm from '../../templates/components/routes/crud/dynamic-form'
import writeCrudListApiCalls from '../../templates/components/routes/crud/[model]/[[api-calls]]'
import writeCrudListContent from '../../templates/components/routes/crud/[model]/index'
import writeDeleteModal from '../../templates/components/routes/crud/[model]/delete-modal'
import writeFilterBar from '../../templates/components/routes/crud/[model]/filter-bar'
import writeCrudNewApiCalls from '../../templates/components/routes/crud/[model]/new/[[api-calls]]'
import writeCrudNewContent from '../../templates/components/routes/crud/[model]/new/index'
import writeCrudEditApiCalls from '../../templates/components/routes/crud/[model]/edit/[[api-calls]]'
import writeCrudEditContent from '../../templates/components/routes/crud/[model]/edit/index'

import writeDashboardApiCalls from '../../templates/components/routes/dashboard/[[api-calls]]'
import writeDashboardContent from '../../templates/components/routes/dashboard/index'
import writeDashboardModelsSection from '../../templates/components/routes/dashboard/models'
import writeDashboardStatCards from '../../templates/components/routes/dashboard/stat-cards'

import writeDriveApiCalls from '../../templates/components/routes/drive/[[api-calls]]'
import writeFilesToUpload from '../../templates/components/routes/drive/files-to-upload'
import writeFolderTree from '../../templates/components/routes/drive/folder-tree'
import writeDrivePage from '../../templates/components/routes/drive/index'
import writeSelectDriveComponent from '../../templates/components/routes/drive/select-drive'
import writeTargetFolderComponent from '../../templates/components/routes/drive/target-folder'
import writeDriveViewApiCalls from '../../templates/components/routes/drive/view/[[api-calls]]'
import writeFolderBreadcrumbs from '../../templates/components/routes/drive/view/folder-breadcrumbs'
import writeFolderContentsTable from '../../templates/components/routes/drive/view/folder-contents-table'
import writeDriveFolderBrowser from '../../templates/components/routes/drive/view/index'

import writeLoginForm from '../../templates/components/routes/login/login-form'

import writeRelationsApiCalls from '../../templates/components/routes/relations/[[api-calls]]'
import writeRelationsContent from '../../templates/components/routes/relations/index'
import writeRelationModelCard from '../../templates/components/routes/relations/relation-model-card'
import writeRelationsConstants from '../../templates/components/routes/relations/relations-constants'

import writeSchemasApiCalls from '../../templates/components/routes/schemas/[[api-calls]]'
import writeSchemaEnumsTab from '../../templates/components/routes/schemas/enums'
import writeSchemasContent from '../../templates/components/routes/schemas/index'
import writeSchemaModelsTab from '../../templates/components/routes/schemas/models'
import writeSchemaModelViewer from '../../templates/components/routes/schemas/viewer'

import writeSeederApiCallsComponent from '../../templates/components/routes/seeder/[[api-calls]]'
import writeSeederConfigPanelComponent from '../../templates/components/routes/seeder/config-panel'
import writeSeederIndexComponent from '../../templates/components/routes/seeder/index'

import writeSkeletonsComponent from '../../templates/components/routes/skeletons'

import writeButtonComponent from '../../templates/components/ui/button'
import writeCardComponent from '../../templates/components/ui/card'
import writeCheckboxComponent from '../../templates/components/ui/checkbox'
import writeInputComponent from '../../templates/components/ui/input'
import writeSelectComponent from '../../templates/components/ui/select'
import writeSkeletonComponent from '../../templates/components/ui/skeleton'
import writeSonnerComponent from '../../templates/components/ui/sonner'
import writeTableComponent from '../../templates/components/ui/table'
import writeTabsComponent from '../../templates/components/ui/tabs'

// Relative output path (under components/) -> the write function producing that file's content.
// Mirrors templates/components/ 1:1, dropping the "templates/" prefix.
const COMPONENT_FILES: Record<string, () => { toString(): string }> = {
  'connection-badge.tsx': writeConnectionBadgeComponent,
  'sidebar.tsx': writeSidebarComponent,

  'providers/query-provider.tsx': writeQueryProviderComponent,

  'routes/crud/[[api-calls]].tsx': writeCrudOverviewApiCalls,
  'routes/crud/index.tsx': writeCrudOverviewContent,
  'routes/crud/dynamic-form.tsx': writeDynamicForm,
  'routes/crud/[model]/[[api-calls]].tsx': writeCrudListApiCalls,
  'routes/crud/[model]/index.tsx': writeCrudListContent,
  'routes/crud/[model]/delete-modal.tsx': writeDeleteModal,
  'routes/crud/[model]/filter-bar.tsx': writeFilterBar,
  'routes/crud/[model]/new/[[api-calls]].tsx': writeCrudNewApiCalls,
  'routes/crud/[model]/new/index.tsx': writeCrudNewContent,
  'routes/crud/[model]/edit/[[api-calls]].tsx': writeCrudEditApiCalls,
  'routes/crud/[model]/edit/index.tsx': writeCrudEditContent,

  'routes/dashboard/[[api-calls]].tsx': writeDashboardApiCalls,
  'routes/dashboard/index.tsx': writeDashboardContent,
  'routes/dashboard/models.tsx': writeDashboardModelsSection,
  'routes/dashboard/stat-cards.tsx': writeDashboardStatCards,

  'routes/drive/[[api-calls]].tsx': writeDriveApiCalls,
  'routes/drive/files-to-upload.tsx': writeFilesToUpload,
  'routes/drive/folder-tree.tsx': writeFolderTree,
  'routes/drive/index.tsx': writeDrivePage,
  'routes/drive/select-drive.tsx': writeSelectDriveComponent,
  'routes/drive/target-folder.tsx': writeTargetFolderComponent,
  'routes/drive/view/[[api-calls]].tsx': writeDriveViewApiCalls,
  'routes/drive/view/folder-breadcrumbs.tsx': writeFolderBreadcrumbs,
  'routes/drive/view/folder-contents-table.tsx': writeFolderContentsTable,
  'routes/drive/view/index.tsx': writeDriveFolderBrowser,

  'routes/login/login-form.tsx': writeLoginForm,

  'routes/relations/[[api-calls]].tsx': writeRelationsApiCalls,
  'routes/relations/index.tsx': writeRelationsContent,
  'routes/relations/relation-model-card.tsx': writeRelationModelCard,
  'routes/relations/relations-constants.ts': writeRelationsConstants,

  'routes/schemas/[[api-calls]].tsx': writeSchemasApiCalls,
  'routes/schemas/enums.tsx': writeSchemaEnumsTab,
  'routes/schemas/index.tsx': writeSchemasContent,
  'routes/schemas/models.tsx': writeSchemaModelsTab,
  'routes/schemas/viewer.tsx': writeSchemaModelViewer,

  'routes/seeder/[[api-calls]].tsx': writeSeederApiCallsComponent,
  'routes/seeder/config-panel.tsx': writeSeederConfigPanelComponent,
  'routes/seeder/index.tsx': writeSeederIndexComponent,

  'routes/skeletons.tsx': writeSkeletonsComponent,

  'ui/button.tsx': writeButtonComponent,
  'ui/card.tsx': writeCardComponent,
  'ui/checkbox.tsx': writeCheckboxComponent,
  'ui/input.tsx': writeInputComponent,
  'ui/select.tsx': writeSelectComponent,
  'ui/skeleton.tsx': writeSkeletonComponent,
  'ui/sonner.tsx': writeSonnerComponent,
  'ui/table.tsx': writeTableComponent,
  'ui/tabs.tsx': writeTabsComponent,
}

export function generateComponents(baseDir: string = process.cwd()): void {
  const componentsDir = path.join(baseDir, "components")

  for (const [relativePath, write] of Object.entries(COMPONENT_FILES)) {
    const outPath = path.join(componentsDir, relativePath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, write().toString())
  }

  // Nearly every component above imports cn (and some import getFieldTypeColor/
  // getRelationTypeColor) from "@/lib/utils", and sidebar.tsx/several route components import
  // acarajePath from "@/lib/acaraje-routes" — write both alongside the components that need them
  // rather than adding a whole separate step for two files.
  const libDir = path.join(baseDir, "lib")
  fs.mkdirSync(libDir, { recursive: true })
  fs.writeFileSync(path.join(libDir, "utils.ts"), writeUtils().toString())
  fs.writeFileSync(path.join(libDir, "acaraje-routes.ts"), writeAcarajeRoutes().toString())
}
