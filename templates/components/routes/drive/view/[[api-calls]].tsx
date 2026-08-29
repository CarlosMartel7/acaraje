import { code, imp } from "ts-poet";

const useEffect = imp("useEffect@react")
const useState = imp("useState@react")
const toast = imp("toast@sonner")
const useDeleteDriveSelection = imp("useDeleteDriveSelection@@/query/hooks/use-drive")
const useDriveContents = imp("useDriveContents@@/query/hooks/use-drive")

export const writeDriveViewApiCalls = () => code`
export default function AcarajeCalls_drive_view() {
  const ROOT = "";
  const [currentPrefix, setCurrentPrefix] = ${useState}(ROOT);
  const [selectedItems, setSelectedItems] = ${useState}<Drive.SelectedItems>({ folders: [], files: [] });

  const { data, isFetched } = ${useDriveContents}(currentPrefix);
  const deleteSelection = ${useDeleteDriveSelection}(currentPrefix);

  const folders = data?.folders ?? [];
  const files = data?.files ?? [];

  ${useEffect}(() => {
    setSelectedItems({ folders: [], files: [] });
  }, [currentPrefix]);

  const handleFolderClick = (folderId: string) => {
    setCurrentPrefix(folderId);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.folders.length === 0 && selectedItems.files.length === 0) return;
    try {
      await deleteSelection.mutateAsync({ folders: selectedItems.folders, files: selectedItems.files });
      ${toast}.success(\`Deleted \${selectedItems.folders.length + selectedItems.files.length} item(s)\`);
      setSelectedItems({ folders: [], files: [] });
    } catch (err) {
      ${toast}.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return {
    ROOT,
    currentPrefix,
    setCurrentPrefix,
    folders,
    files,
    hasLoaded: isFetched,
    deleting: deleteSelection.isPending,
    selectedItems,
    setSelectedItems,
    handleFolderClick,
    handleDeleteSelected,
  };
}
`;

export default writeDriveViewApiCalls;
