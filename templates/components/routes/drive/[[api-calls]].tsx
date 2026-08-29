import { code, imp } from "ts-poet";

const Dispatch = imp("t:Dispatch@react")
const SetStateAction = imp("t:SetStateAction@react")
const useCallback = imp("useCallback@react")
const toast = imp("toast@sonner")
const useCreateDriveFolder = imp("useCreateDriveFolder@@/query/hooks/use-drive")
const useDeleteDriveFolder = imp("useDeleteDriveFolder@@/query/hooks/use-drive")

export const writeDriveApiCalls = () => code`
export default function AcarajeCalls_drive(
  setFolders: ${Dispatch}<${SetStateAction}<Drive.FolderNode[]>>,
  removeFolderFromTree: any,
  renameFolderInTree: any,
  addSubfolderToTree: any,
  onChange: any,
  value: any,
) {
  const deleteFolder = ${useDeleteDriveFolder}();
  const createFolder = ${useCreateDriveFolder}();

  const handleDelete = ${useCallback}(
    (folder: Drive.FolderNode) => {
      ${toast}.promise(
        (async () => {
          await deleteFolder.mutateAsync(folder.id);
          setFolders((prev) => removeFolderFromTree(prev, folder.id));
          if (value?.folderId === folder.id) onChange(null);
        })(),
        {
          loading: "Deleting folder...",
          success: "Folder deleted",
          error: (err) => (err instanceof Error ? err.message : "Failed to delete folder"),
        },
      );
    },
    [onChange, value, deleteFolder],
  );

  const handleRename = ${useCallback}((folder: Drive.FolderNode, newName: string) => {
    setFolders((prev) => renameFolderInTree(prev, folder.id, newName));
  }, []);

  const handleCreatefolder = ${useCallback}(
    (parent?: Drive.FolderNode, name?: string) => {
      ${toast}.promise(
        (async () => {
          const data = await createFolder.mutateAsync({
            name: name?.trim() || "New folder",
            parentId: parent ? parent.id : undefined,
          });

          const newFolder: Drive.FolderNode = {
            id: data.id,
            name: data.name ?? name?.trim() ?? "New folder",
            children: [],
            webViewLink: data.webViewLink,
          };

          if (parent) {
            setFolders((prev) => addSubfolderToTree(prev, parent.id, newFolder));
          } else {
            setFolders((prev) => [...prev, newFolder]);
          }
          return newFolder;
        })(),
        {
          loading: "Creating folder...",
          success: (data) => \`Folder "\${data?.name ?? "New folder"}" created\`,
          error: (err) => (err instanceof Error ? err.message : "Failed to create folder"),
        },
      );
    },
    [createFolder],
  );

  return { handleDelete, handleRename, handleCreatefolder };
}
`;

export default writeDriveApiCalls;
