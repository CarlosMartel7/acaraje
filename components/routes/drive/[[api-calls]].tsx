import { Dispatch, SetStateAction, useCallback } from "react";
import { toast } from "sonner";
import type { FolderNode } from "./folder-tree";

export default function AcarajeCalls_drive(
  setFolders: Dispatch<SetStateAction<FolderNode[]>>,
  removeFolderFromTree: any,
  renameFolderInTree: any,
  addSubfolderToTree: any,
  onChange: any,
  value: any,
) {
  const handleDelete = useCallback(
    (folder: FolderNode) => {
      toast.promise(
        (async () => {
          const response = await fetch(`/api/acaraje/drive/folders?folderId=${encodeURIComponent(folder.id)}`, {
            method: "DELETE",
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);

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
    [onChange, value],
  );

  const handleRename = useCallback((folder: FolderNode, newName: string) => {
    setFolders((prev) => renameFolderInTree(prev, folder.id, newName));
  }, []);

  const handleCreatefolder = useCallback((parent?: FolderNode, name?: string) => {
    toast.promise(
      (async () => {
        const response = await fetch("/api/acaraje/drive/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name?.trim() || "New folder",
            parentId: parent ? parent.id : undefined,
          }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const newFolder: FolderNode = {
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
        success: (data) => `Folder "${data?.name ?? "New folder"}" created`,
        error: (err) => (err instanceof Error ? err.message : "Failed to create folder"),
      },
    );
  }, []);

  return { handleDelete, handleRename, handleCreatefolder };
}
