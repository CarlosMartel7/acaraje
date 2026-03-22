import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SelectDrive } from "@/components/routes/drive/select-drive";
import { TargetFolder } from "@/components/routes/drive/target-folder";
import { FilesToUpload } from "@/components/routes/drive/files-to-upload";
type RawFolder = { id: string; name: string; parents?: string[]; webViewLink?: string };

function structureFolders(folders: RawFolder[]): Drive.FolderNode[] {
  const filtered = folders.filter((f) => f.parents?.[0] !== f.id);
  const byId = new Map<string, Drive.FolderNode>();
  for (const f of filtered) {
    byId.set(f.id, { id: f.id, name: f.name, children: [], webViewLink: f.webViewLink });
  }
  const roots: Drive.FolderNode[] = [];
  for (const f of filtered) {
    const node = byId.get(f.id)!;
    const parentId = f.parents?.[0];
    if (!parentId || !byId.has(parentId)) {
      roots.push(node);
    } else {
      const parent = byId.get(parentId)!;
      (parent.children ??= []).push(node);
    }
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  for (const node of byId.values()) {
    if (node.children?.length) node.children.sort((a, b) => a.name.localeCompare(b.name));
  }
  return roots;
}

export default function DrivePageInner() {
  const searchParams = useSearchParams();
  const [selectedDrive, setSelectedDrive] = useState<Drive.DriveType>("minio");
  const [selectedFolder, setSelectedFolder] = useState<Drive.SelectedFolder | null>(null);
  const [files, setFiles] = useState<Drive.SelectedFile[]>([]);
  const [fetchedFolders, setFetchedFolders] = useState<Drive.FolderNode[]>([]);

  useEffect(() => {
    const id = searchParams.get("folderId");
    if (id) setSelectedFolder({ folderId: id, name: "" });
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/acaraje/drive/folders")
      .then((r) => r.json())
      .then((data) => setFetchedFolders(structureFolders(data.folders ?? [])))
      .catch(() => setFetchedFolders([]));
  }, []);

  return (
    <div className="p-8 space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Drive Upload</h1>
        <p className="text-muted-foreground text-sm mt-1">Select a folder and upload files to MinIO storage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SelectDrive value={selectedDrive} onChange={setSelectedDrive} />
        <TargetFolder value={selectedFolder} onChange={setSelectedFolder} folders={fetchedFolders || []} setFolders={setFetchedFolders} />
      </div>
      <FilesToUpload files={files} setFiles={setFiles} selectedFolder={selectedFolder} />
    </div>
  );
}
