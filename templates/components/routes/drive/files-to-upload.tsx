import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const useCallback = imp("useCallback@react")
const ArrowUp = imp("ArrowUp@lucide-react")
const FileIcon = imp("File@lucide-react")
const X = imp("X@lucide-react")
const Loader2 = imp("Loader2@lucide-react")
const CheckCircle = imp("CheckCircle@lucide-react")
const AlertCircle = imp("AlertCircle@lucide-react")
const Pencil = imp("Pencil@lucide-react")
const cn = imp("cn@@/lib/utils")
const Button = imp("Button@@/components/ui/button")
const Input = imp("Input@@/components/ui/input")
const Card = imp("Card@@/components/ui/card")

export const writeFilesToUpload = () => code`
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return \`\${bytes} B\`;
  if (bytes < 1024 * 1024) return \`\${(bytes / 1024).toFixed(1)} KB\`;
  return \`\${(bytes / (1024 * 1024)).toFixed(1)} MB\`;
}

interface FilesToUploadProps {
  files: Drive.SelectedFile[];
  setFiles: React.Dispatch<React.SetStateAction<Drive.SelectedFile[]>>;
  selectedFolder: Drive.SelectedFolder | null;
}

export function FilesToUpload({ files, setFiles, selectedFolder }: FilesToUploadProps) {
  const [isDragging, setIsDragging] = ${useState}(false);
  const [isUploading, setIsUploading] = ${useState}(false);
  const [uploadComplete, setUploadComplete] = ${useState}(false);
  const [editingId, setEditingId] = ${useState}<string | null>(null);
  const [editingValue, setEditingValue] = ${useState}("");

  const addFiles = ${useCallback}(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const added: Drive.SelectedFile[] = fileArray.map((file) => ({
        file,
        id: \`\${file.name}-\${file.size}-\${Date.now()}-\${Math.random()}\`,
        displayName: file.name,
        status: "pending",
      }));
      setFiles((prev) => [...prev, ...added]);
      setUploadComplete(false);
    },
    [setFiles],
  );

  const removeFile = ${useCallback}(
    (id: string) => {
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setEditingId((prev) => (prev === id ? null : prev));
    },
    [setFiles],
  );

  const startRename = ${useCallback}((item: Drive.SelectedFile) => {
    setEditingId(item.id);
    setEditingValue(item.displayName);
  }, []);

  const commitRename = ${useCallback}(() => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    setFiles((prev) => prev.map((f) => (f.id === editingId ? { ...f, displayName: trimmed || f.file.name } : f)));
    setEditingId(null);
    setEditingValue("");
  }, [editingId, editingValue, setFiles]);

  const cancelRename = ${useCallback}(() => {
    setEditingId(null);
    setEditingValue("");
  }, []);

  const handleDrop = ${useCallback}(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = ${useCallback}((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = ${useCallback}((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = ${useCallback}(
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
      setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" as const } : f)));

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("folderId", selectedFolder.folderId);
        formData.append("displayName", item.displayName);

        const res = await fetch("/api/drive/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || \`Upload failed: \${res.status}\`);
        }

        setFiles([]);
      } catch (err) {
        setFiles((prev) =>
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

  const uploadCount = pendingCount || files.length;
  const destination = selectedFolder ? selectedFolder.name || selectedFolder.folderId : null;

  return (
    <div className="space-y-4">
      <${Card}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={${cn}(
          "border-dashed px-6 py-[52px] text-center transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-primary/60",
        )}
      >
        <input type="file" multiple onChange={handleFileInput} className="peer sr-only" id="drive-file-input" />
        <label
          htmlFor="drive-file-input"
          className="mx-auto flex max-w-sm cursor-pointer flex-col items-center rounded-xl p-2 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50"
        >
          <span className="mb-3.5 flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-primary/15 text-primary">
            <${ArrowUp} className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold">{isDragging ? "Drop files here" : "Drop files here or click to browse"}</span>
          <span className="mt-1 text-xs text-muted-foreground">Any file type · multiple files supported</span>
        </label>

        <p className={${cn}("mt-4 text-xs", destination ? "text-muted-foreground" : "text-warning")}>
          {destination ? (
            <>
              Uploading to <span className="font-mono text-foreground">{destination}</span>
            </>
          ) : (
            "Select a target folder above before uploading"
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <${Button} size="lg" onClick={handleUpload} disabled={!canUpload} className="h-10 px-6 text-xs">
            {isUploading && <${Loader2} className="h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading…" : \`Upload \${uploadCount} file\${uploadCount !== 1 ? "s" : ""}\`}
          </${Button}>
          {uploadComplete && files.length > 0 && files.every((f) => f.status === "success") && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <${CheckCircle} className="h-4 w-4" />
              Upload complete
            </span>
          )}
        </div>
      </${Card}>

      {files.length > 0 && (
        <${Card} className="p-[18px]">
          <h2 className="mb-3 text-sm font-semibold">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </h2>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto">
            {files.map((item) => {
              const isEditing = editingId === item.id;
              const editable = item.status === "pending" || item.status === "error";
              return (
                <li key={item.id} className="flex items-center gap-3 py-2.5 text-xs">
                  <${FileIcon} className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {isEditing ? (
                      <${Input}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        aria-label="File name"
                        className="h-8 min-w-0 flex-1 font-mono text-xs"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate font-mono">{item.displayName}</span>
                    )}
                    {editable && !isEditing && (
                      <${Button}
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => startRename(item)}
                        aria-label={\`Rename \${item.displayName}\`}
                        title="Rename file"
                      >
                        <${Pencil} className="h-3.5 w-3.5" />
                      </${Button}>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">{formatFileSize(item.file.size)}</span>
                  {item.status === "uploading" && <${Loader2} className="h-4 w-4 flex-shrink-0 animate-spin text-primary" aria-label="Uploading" />}
                  {item.status === "success" && <${CheckCircle} className="h-4 w-4 flex-shrink-0 text-success" aria-label="Uploaded" />}
                  {item.status === "error" && <${AlertCircle} className="h-4 w-4 flex-shrink-0 text-destructive" aria-label="Upload failed" />}
                  {item.status !== "uploading" && (
                    <${Button}
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 flex-shrink-0 hover:text-destructive"
                      onClick={() => removeFile(item.id)}
                      aria-label={\`Remove \${item.displayName}\`}
                    >
                      <${X} className="h-3.5 w-3.5" />
                    </${Button}>
                  )}
                </li>
              );
            })}
          </ul>
        </${Card}>
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeFilesToUpload;
