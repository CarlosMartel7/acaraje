import { code, imp } from "ts-poet";

const FolderOpen = imp("FolderOpen@lucide-react")
const Trash2 = imp("Trash2@lucide-react")
const Button = imp("Button@@/components/ui/button")
const FolderContentsTable = imp("FolderContentsTable@./folder-contents-table")
const AcarajeCalls_drive_view = imp("AcarajeCalls_drive_view=./[[api-calls]]")
const DriveFolderBreadcrumbs = imp("DriveFolderBreadcrumbs@./folder-breadcrumbs")
const parseFolderBreadcrumb = imp("parseFolderBreadcrumb@./folder-breadcrumbs")
const DriveViewHeader = imp("DriveViewHeader@@/components/routes/skeletons")
const DriveViewBodySkeleton = imp("DriveViewBodySkeleton@@/components/routes/skeletons")

export const writeDriveFolderBrowser = () => code`
export function DriveFolderBrowser() {
  const {
    ROOT,
    currentPrefix,
    setCurrentPrefix,
    folders,
    files,
    hasLoaded,
    deleting,
    selectedItems,
    setSelectedItems,
    handleFolderClick,
    handleDeleteSelected,
  } = ${AcarajeCalls_drive_view}();

  const breadcrumbs = ${parseFolderBreadcrumb}(currentPrefix);
  const hasSelection = selectedItems.folders.length > 0 || selectedItems.files.length > 0;

  return (
    <div className="p-8 space-y-6 animate-in">
      <${DriveViewHeader} />
      <div className="space-y-4">
        <${DriveFolderBreadcrumbs} rootPrefix={ROOT} breadcrumbs={breadcrumbs} onNavigate={setCurrentPrefix} />

        {!hasLoaded ? (
          <${DriveViewBodySkeleton} />
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-muted-foreground text-sm">
            <${FolderOpen} className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>This folder is empty</p>
            {currentPrefix !== ROOT && (
              <button
                type="button"
                onClick={() => setCurrentPrefix(breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2]!.id : ROOT)}
                className="mt-2 text-foreground hover:underline"
              >
                Go back
              </button>
            )}
          </div>
        ) : (
          <>
            {hasSelection && (
              <div className="flex items-center gap-3">
                <${Button} variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deleting}>
                  <${Trash2} className="w-4 h-4 mr-2" />
                  {deleting ? "Deleting…" : \`Delete \${selectedItems.folders.length + selectedItems.files.length} selected\`}
                </${Button}>
                <span className="text-xs text-muted-foreground">
                  {selectedItems.folders.length} folder(s), {selectedItems.files.length} file(s)
                </span>
              </div>
            )}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <${FolderContentsTable}
                folders={folders}
                files={files}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onFolderClick={handleFolderClick}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeDriveFolderBrowser;
