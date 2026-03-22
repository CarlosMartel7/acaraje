"use client";

import { Folder, File } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface FolderContentsTableProps {
  folders: Storage.FolderEntry[];
  files: Storage.FileEntry[];
  selectedItems: Drive.SelectedItems;
  onSelectionChange: (items: Drive.SelectedItems) => void;
  onFolderClick: (folderId: string) => void;
  className?: string;
}

export function FolderContentsTable({
  folders,
  files,
  selectedItems,
  onSelectionChange,
  onFolderClick,
  className,
}: FolderContentsTableProps) {
  const selectedFoldersSet = new Set(selectedItems.folders);
  const selectedFilesSet = new Set(selectedItems.files);
  const allFolderIds = folders.map((f) => f.id);
  const allFileKeys = files.map((f) => f.key);
  const allSelected = folders.length + files.length > 0 &&
    allFolderIds.every((id) => selectedFoldersSet.has(id)) &&
    allFileKeys.every((k) => selectedFilesSet.has(k));
  const someSelected = selectedFoldersSet.size > 0 || selectedFilesSet.size > 0;

  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      onSelectionChange({
        folders: [...allFolderIds],
        files: [...allFileKeys],
      });
    } else {
      onSelectionChange({ folders: [], files: [] });
    }
  };

  const toggleFolder = (folderId: string, checked: boolean | "indeterminate") => {
    if (checked) {
      onSelectionChange({
        folders: [...selectedItems.folders, folderId],
        files: selectedItems.files,
      });
    } else {
      onSelectionChange({
        folders: selectedItems.folders.filter((id) => id !== folderId),
        files: selectedItems.files,
      });
    }
  };

  const toggleFile = (key: string, checked: boolean | "indeterminate") => {
    if (checked) {
      onSelectionChange({
        folders: selectedItems.folders,
        files: [...selectedItems.files, key],
      });
    } else {
      onSelectionChange({
        folders: selectedItems.folders,
        files: selectedItems.files.filter((k) => k !== key),
      });
    }
  };

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>CreatedAt</TableHead>
            <TableHead>Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders.map((folder) => (
            <TableRow
              key={folder.id}
              className="cursor-pointer hover:bg-accent/50"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-select]")) return;
                onFolderClick(folder.id);
              }}
            >
              <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  data-select
                  checked={selectedFoldersSet.has(folder.id)}
                  onCheckedChange={(c) => toggleFolder(folder.id, c)}
                  aria-label={`Select ${folder.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary-foreground/80 flex-shrink-0" />
                  <span>{folder.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
            </TableRow>
          ))}
          {files.map((file) => (
            <TableRow key={file.key}>
              <TableCell className="w-10">
                <Checkbox
                  checked={selectedFilesSet.has(file.key)}
                  onCheckedChange={(c) => toggleFile(file.key, c)}
                  aria-label={`Select ${file.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{file.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(file.lastModified)}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {formatSize(file.size)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
