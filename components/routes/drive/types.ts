export type DriveType = "minio";

export interface SelectedFolder {
  folderId: string;
  name: string;
}

export interface SelectedFile {
  file: File;
  id: string;
  displayName: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}
