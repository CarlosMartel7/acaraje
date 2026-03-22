import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AcarajeCalls_drive_view() {
  const ROOT = "";
  const [currentPrefix, setCurrentPrefix] = useState(ROOT);
  const [folders, setFolders] = useState<Storage.FolderEntry[]>([]);
  const [files, setFiles] = useState<Storage.FileEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Drive.SelectedItems>({ folders: [], files: [] });

  const fetchContents = useCallback(async (prefix: string) => {
    try {
      const url = `/api/acaraje/drive/contents?prefix=${encodeURIComponent(prefix)}`;
      const res = await fetch(url);
      const data = await res.json();
      setFolders(data.folders ?? []);
      setFiles(data.files ?? []);
      setSelectedItems({ folders: [], files: [] });
    } catch {
      setFolders([]);
      setFiles([]);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchContents(currentPrefix);
  }, [currentPrefix, fetchContents]);

  const handleFolderClick = (folderId: string) => {
    setCurrentPrefix(folderId);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.folders.length === 0 && selectedItems.files.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/acaraje/drive/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folders: selectedItems.folders,
          files: selectedItems.files,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      toast.success(`Deleted ${selectedItems.folders.length + selectedItems.files.length} item(s)`);
      setSelectedItems({ folders: [], files: [] });
      fetchContents(currentPrefix);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return {
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
  };
}
