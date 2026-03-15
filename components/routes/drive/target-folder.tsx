"use client";

import { useState, useCallback, Dispatch, SetStateAction } from "react";
import { FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderTree, type FolderNode } from "./folder-tree";
import type { SelectedFolder } from "./types";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function removeFolderFromTree(nodes: FolderNode[], id: string): FolderNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: n.children ? removeFolderFromTree(n.children, id) : undefined,
    }));
}

function renameFolderInTree(nodes: FolderNode[], id: string, newName: string): FolderNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, name: newName }
      : {
          ...n,
          children: n.children ? renameFolderInTree(n.children, id, newName) : undefined,
        },
  );
}

function addSubfolderToTree(nodes: FolderNode[], parentId: string, newFolder: FolderNode): FolderNode[] {
  return nodes.map((n) =>
    n.id === parentId
      ? {
          ...n,
          children: [...(n.children || []), newFolder],
        }
      : {
          ...n,
          children: n.children ? addSubfolderToTree(n.children, parentId, newFolder) : undefined,
        },
  );
}

interface TargetFolderProps {
  value: SelectedFolder | null;
  onChange: (value: SelectedFolder | null) => void;
  folders: FolderNode[];
  setFolders: Dispatch<SetStateAction<FolderNode[]>>;
}

export function TargetFolder({ value, onChange, folders, setFolders }: TargetFolderProps) {
  const handleDelete = useCallback(
    async (folder: FolderNode) => {
      const response = await fetch(`/api/drive/folders?folderId=${encodeURIComponent(folder.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setFolders((prev) => removeFolderFromTree(prev, folder.id));
      if (value?.folderId === folder.id) onChange(null);
    },
    [onChange, value],
  );

  const handleRename = useCallback((folder: FolderNode, newName: string) => {
    setFolders((prev) => renameFolderInTree(prev, folder.id, newName));
  }, []);

  const handleCreateSubfolder = useCallback((parent: FolderNode) => {
    const newFolder: FolderNode = {
      id: generateId(),
      name: "New folder",
      children: [],
    };
    setFolders((prev) => addSubfolderToTree(prev, parent.id, newFolder));
  }, []);

  const handleCreateRootFolder = useCallback(() => {
    const newFolder: FolderNode = {
      id: generateId(),
      name: "New folder",
      children: [],
    };
    setFolders((prev) => [...prev, newFolder]);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Target Folder
        </CardTitle>
        <CardDescription>Select a folder, or create, rename, and delete folders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/50 p-2 max-h-[320px] overflow-y-auto">
          <FolderTree
            folders={folders}
            selectedId={value?.folderId ?? null}
            onSelect={(folder) => onChange({ folderId: folder.id, name: folder.name })}
            onDelete={handleDelete}
            onRename={handleRename}
            onCreateSubfolder={handleCreateSubfolder}
            onCreateRootFolder={handleCreateRootFolder}
            defaultExpanded={new Set(["root", "1abc", "2def", "3ghi"])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
