"use client";

import { useState, useCallback } from "react";
import { Upload, File, X, Loader2, CheckCircle, AlertCircle, Pencil, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SelectedFile, SelectedFolder } from "./types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FilesToUploadProps {
  files: SelectedFile[];
  onFilesChange: (updater: (prev: SelectedFile[]) => SelectedFile[]) => void;
  selectedFolder: SelectedFolder | null;
}

export function FilesToUpload({ files, onFilesChange, selectedFolder }: FilesToUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const added: SelectedFile[] = fileArray.map((file) => ({
        file,
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        displayName: file.name,
        status: "pending",
      }));
      onFilesChange((prev) => [...prev, ...added]);
      setUploadComplete(false);
    },
    [onFilesChange],
  );

  const removeFile = useCallback(
    (id: string) => {
      onFilesChange((prev) => prev.filter((f) => f.id !== id));
      setEditingId((prev) => (prev === id ? null : prev));
    },
    [onFilesChange],
  );

  const startRename = useCallback((item: SelectedFile) => {
    setEditingId(item.id);
    setEditingValue(item.displayName);
  }, []);

  const commitRename = useCallback(() => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    onFilesChange((prev) => prev.map((f) => (f.id === editingId ? { ...f, displayName: trimmed || f.file.name } : f)));
    setEditingId(null);
    setEditingValue("");
  }, [editingId, editingValue, onFilesChange]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditingValue("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      if (input.files?.length) addFiles(input.files);
      input.value = "";
    },
    [addFiles],
  );

  const handleUpload = async () => {
    if (!selectedFolder?.folderId.trim()) return;
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadComplete(false);

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      onFilesChange((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" as const } : f)));

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("folderId", selectedFolder.folderId);
        formData.append("displayName", item.displayName);

        const res = await fetch("/api/acaraje/drive/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed: ${res.status}`);
        }

        onFilesChange((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "success" as const } : f)));
      } catch (err) {
        onFilesChange((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error" as const, error: err instanceof Error ? err.message : "Upload failed" } : f,
          ),
        );
      }
    }

    setIsUploading(false);
    setUploadComplete(true);
  };

  const canUpload = Boolean(selectedFolder?.folderId?.trim()) && files.length > 0 && !isUploading;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Files to Upload
          </CardTitle>
          <CardDescription>Drag and drop files or click to browse</CardDescription>
        </div>

        {selectedFolder && (
          <div className="flex items-center gap-3 rounded-lg">
            <FolderOpen className="w-5 h-5 text-primary-foreground/80 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary-foreground">Upload destination</p>
              <p className="text-xs font-mono text-primary-foreground/70 truncate mt-0.5">
                {selectedFolder.name || selectedFolder.folderId.slice(0, 10)}
                {selectedFolder.name && <span className="text-muted-foreground/60 ml-1">· {selectedFolder.folderId.slice(0, 10)}</span>}
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
            isDragging ? "border-primary-foreground/50 bg-primary/10" : "border-border/50 hover:border-border",
          )}
        >
          <input type="file" multiple onChange={handleFileInput} className="hidden" id="drive-file-input" />
          <label htmlFor="drive-file-input" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center">
              <Upload className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{isDragging ? "Drop files here" : "Drop files or click to select"}</p>
              <p className="text-xs text-muted-foreground mt-1">Any file type · Multiple files supported</p>
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-mono text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded border border-border/50 p-2">
              {files.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded bg-secondary/30 text-sm">
                    <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      {isEditing ? (
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          className="h-7 text-xs font-mono flex-1 min-w-0"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => (item.status === "pending" || item.status === "error") && startRename(item)}
                          className={cn(
                            "truncate font-mono text-xs text-left w-full",
                            (item.status === "pending" || item.status === "error") && "hover:text-primary-foreground cursor-pointer",
                          )}
                        >
                          {item.displayName}
                        </button>
                      )}
                      {(item.status === "pending" || item.status === "error") && !isEditing && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6 text-muted-foreground hover:text-primary-foreground flex-shrink-0"
                          onClick={() => startRename(item)}
                          title="Rename file"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{formatFileSize(item.file.size)}</span>
                    {item.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary-foreground flex-shrink-0" />}
                    {item.status === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    {item.status === "error" && <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
                    {(item.status === "pending" || item.status === "success" || item.status === "error") && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeFile(item.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleUpload} disabled={!canUpload} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploading ? "Uploading…" : `Upload ${pendingCount || files.length} file${(pendingCount || files.length) !== 1 ? "s" : ""}`}
          </Button>
          {uploadComplete && files.every((f) => f.status === "success") && (
            <span className="text-sm text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Upload complete
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
