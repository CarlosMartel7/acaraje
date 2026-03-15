"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SelectDrive } from "@/components/routes/drive/select-drive";
import { TargetFolder } from "@/components/routes/drive/target-folder";
import { FilesToUpload } from "@/components/routes/drive/files-to-upload";
import type { DriveType, SelectedFile, SelectedFolder } from "@/components/routes/drive/types";
import { FolderNode } from "@/components/routes/drive/folder-tree";

function structureFolders(folders: FolderNode[]) {}

export default function DrivePage() {
  const searchParams = useSearchParams();
  const [selectedDrive, setSelectedDrive] = useState<DriveType>("google-drive");
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder | null>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [fetchedFolders, setFetchedFolders] = useState<FolderNode[]>([]);

  useEffect(() => {
    const id = searchParams.get("folderId");
    if (id) setSelectedFolder({ folderId: id, name: "" });
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/drive/folders")
      .then((r) => r.json())
      .then((data) => setFetchedFolders(data.folders ?? []))
      .catch(() => setFetchedFolders([]));
  }, []);

  return (
    <div className="p-8 space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Drive Upload</h1>
        <p className="text-muted-foreground text-sm mt-1">Select a folder and upload files to the company Drive</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SelectDrive value={selectedDrive} onChange={setSelectedDrive} />
        <TargetFolder value={selectedFolder} onChange={setSelectedFolder} folders={fetchedFolders || []} setFolders={setFetchedFolders} />
      </div>

      <FilesToUpload files={files} onFilesChange={setFiles} selectedFolder={selectedFolder} />
    </div>
  );
}
